"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { copiarDocumentoEnStorage, eliminarDocumentoDeStorage } from "@/lib/supabase/storage";
import {
  datosDelCursoCopiado,
  datosDeLaActividadCopiada,
  datosDelQuizCopiado,
  seccionesCopiadas,
  traducirSeccion,
  type CursoOriginal,
} from "@/lib/course-copy";

/**
 * US47 — un Tutor adopta el curso de otro y se queda con su propia copia
 * (23/11/2026).
 *
 * Qué se copia y qué no está en `lib/course-copy.ts`, que es la parte
 * probada sola. Aquí vive lo que no se puede probar sin base de datos: el
 * orden de las operaciones.
 *
 * **Storage primero, base de datos después, y si algo falla se borra lo
 * subido** — el mismo patrón de compensación de US09 y de las entregas. Un
 * archivo huérfano es desperdicio; una fila que apunta a un archivo que no
 * existe es un error que el adoptante descubre semanas después, abriendo
 * una lección.
 *
 * **Los documentos se duplican, no se comparten.** Si las dos copias
 * apuntaran al mismo archivo, el día que el autor borre su curso el
 * adoptante se queda con documentos rotos.
 */
const esquema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
});

type Resultado = { success: false; error: string };

export async function adoptarCurso(
  _prevState: Resultado | null,
  formData: FormData
): Promise<Resultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede adoptar un curso." };
  }

  const parsed = esquema.safeParse({ courseId: formData.get("courseId") });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const original = await prisma.courses.findUnique({
    where: { id: parsed.data.courseId },
    include: {
      tutor: { select: { nombre: true, apellido: true } },
      secciones: { orderBy: { orden: "asc" } },
      contenidos: { orderBy: { orden: "asc" }, include: { documentos: true } },
      actividades: { orderBy: { orden: "asc" } },
      quizzes: {
        orderBy: { orden: "asc" },
        include: {
          preguntas: { orderBy: { orden: "asc" }, include: { opciones: true } },
        },
      },
    },
  });

  // La comprobación que sostiene toda la historia: solo se puede adoptar un
  // curso que su autor marcó como compartible. Conocer el id de un curso
  // privado no debe alcanzar para sacarlo de su espacio.
  if (!original || !original.compartible) {
    return { success: false, error: "Ese curso no está disponible para adoptar." };
  }

  if (original.tutorId === usuarioActual.id) {
    return { success: false, error: "Este curso ya es tuyo." };
  }

  const yaAdoptado = await prisma.courses.findFirst({
    where: { tutorId: usuarioActual.id, origenCursoId: original.id },
    select: { id: true },
  });

  if (yaAdoptado) {
    return {
      success: false,
      error: "Ya tienes una copia de este curso. Búscala en Mis cursos.",
    };
  }

  // Los archivos se copian ANTES de abrir la transacción: una transacción
  // de base de datos no puede deshacer una subida a Storage, así que
  // conviene que lo que puede fallar por red ya esté resuelto cuando se
  // empieza a escribir.
  const copiados: string[] = [];
  const pathNuevoPorOriginal = new Map<string, string>();

  try {
    for (const contenido of original.contenidos) {
      for (const documento of contenido.documentos) {
        const { path } = await copiarDocumentoEnStorage(documento.archivo, usuarioActual.id);
        pathNuevoPorOriginal.set(documento.archivo, path);
        copiados.push(path);
      }
    }
  } catch (error) {
    await Promise.all(copiados.map((path) => eliminarDocumentoDeStorage(path)));
    console.error("Error copiando los documentos del curso adoptado:", error);
    return { success: false, error: "No se pudieron copiar los documentos del curso." };
  }

  let nuevoCursoId: string;

  try {
    nuevoCursoId = await prisma.$transaction(async (tx) => {
      const copia = await tx.courses.create({
        data: datosDelCursoCopiado(original as unknown as CursoOriginal, usuarioActual.id),
      });

      const { datos, posicionPorIdViejo } = seccionesCopiadas(original.secciones);

      // Se crean una a una y no con createMany porque hacen falta los ids
      // nuevos para remapear: sin eso, el contenido quedaría colgando de
      // las secciones del curso original.
      const idsNuevos: string[] = [];
      for (const seccion of datos) {
        const creada = await tx.secciones.create({
          data: { ...seccion, estado: seccion.estado as never, courseId: copia.id },
        });
        idsNuevos.push(creada.id);
      }

      const seccionDe = (seccionId: string | null) =>
        traducirSeccion(seccionId, idsNuevos, posicionPorIdViejo);

      for (const contenido of original.contenidos) {
        await tx.contents.create({
          data: {
            courseId: copia.id,
            seccionId: seccionDe(contenido.seccionId),
            titulo: contenido.titulo,
            descripcion: contenido.descripcion,
            tipo: contenido.tipo,
            // Para un DOCUMENTO, `contenido` guarda la ruta del archivo:
            // tiene que apuntar a la copia, no al original.
            contenido: pathNuevoPorOriginal.get(contenido.contenido) ?? contenido.contenido,
            orden: contenido.orden,
            visible: contenido.visible,
            documentos: {
              create: contenido.documentos.map(
                (documento: { archivo: string; nombre: string; tipo: string }) => ({
                  archivo: pathNuevoPorOriginal.get(documento.archivo) ?? documento.archivo,
                  nombre: documento.nombre,
                  tipo: documento.tipo,
                })
              ),
            },
          },
        });
      }

      for (const actividad of original.actividades) {
        await tx.actividades.create({
          data: {
            ...datosDeLaActividadCopiada(actividad, seccionDe(actividad.seccionId)),
            courseId: copia.id,
          },
        });
      }

      for (const quiz of original.quizzes) {
        await tx.quizzes.create({
          data: {
            ...datosDelQuizCopiado(quiz, seccionDe(quiz.seccionId)),
            courseId: copia.id,
          },
        });
      }

      return copia.id;
    });
  } catch (error) {
    // Si la base de datos falló, los archivos que se acaban de copiar no
    // los referencia nadie.
    await Promise.all(copiados.map((path) => eliminarDocumentoDeStorage(path)));
    console.error("Error adoptando el curso:", error);
    return { success: false, error: "No se pudo adoptar el curso. Intenta de nuevo." };
  }

  revalidatePath("/tutor/cursos");
  revalidatePath("/tutor/catalogo");

  // Se entra directo a la copia: lo siguiente que va a hacer el tutor es
  // revisarla y adaptarla, que es para lo que nace en borrador.
  redirect(`/tutor/cursos/${nuevoCursoId}`);
}
