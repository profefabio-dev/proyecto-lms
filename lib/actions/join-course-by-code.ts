"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol, EstadoUsuario, EstadoCurso } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  LARGO_CODIGO_CURSO,
  cursosQueCoinciden,
  filtroPorCodigoCurso,
  normalizarCodigoCurso,
} from "@/lib/course-code";

const unirseSchema = z.object({
  codigo: z
    .string()
    .min(1, "Escribe el código que te dio tu profesor.")
    .max(20, "El código es demasiado largo."),
});

export type ResultadoUnirseCurso =
  | {
      success: true;
      courseId: string;
      titulo: string;
      yaInscrito: boolean;
    }
  | { success: false; error: string };

/**
 * US51: un estudiante se inscribe a un curso publicado escribiendo su
 * código de clase.
 *
 * **Endurecida el 26/11/2026** (decisión del docente, opción b de las tres
 * que quedaron escritas en la fila de US51 del `Backlog.md`). La primera
 * versión aceptaba **prefijos de cuatro caracteres** y resolvía la búsqueda
 * trayendo **todos** los cursos publicados de la plataforma para filtrarlos
 * en memoria con un `startsWith`, quedándose con el primero que coincidiera.
 * Eso tenía tres problemas, y los tres se corrigen acá sin migración:
 *
 *   1. **Cuatro caracteres hexadecimales son 65 536 combinaciones**, y
 *      quien probara al azar entraría a un curso cualquiera de cualquier
 *      colegio. Ahora se exigen los **ocho** completos.
 *   2. **`.find()` devolvía un curso arbitrario** entre los que coincidieran
 *      con el prefijo, sin avisar. Ahora, si dos cursos coincidieran, se
 *      rechaza el código en vez de inscribir al estudiante en el curso
 *      equivocado — es improbabilísimo con ocho caracteres, pero inscribirse
 *      en el curso de otro profesor sin que nadie lo note es peor que un
 *      mensaje de error.
 *   3. **Filtrar en memoria** obliga a leer toda la tabla en cada intento.
 *      Ahora filtra la base de datos por prefijo del id, que es su clave
 *      primaria.
 *
 * **Lo que esta corrección NO resuelve, y queda escrito:** el código se
 * deriva del id del curso, así que **no se puede revocar ni rotar**. Si se
 * filtra, la única salida es rehacer el curso. Para eso hace falta una
 * columna `codigo` propia, aleatoria e indexada, con un botón de
 * "restablecer código" — opción (c) de la fila de US51.
 */
export async function unirseACursoConCodigo(
  _prevState: ResultadoUnirseCurso | null,
  formData: FormData
): Promise<ResultadoUnirseCurso> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({
    where: { authId: user.id },
  });

  if (!usuarioActual || usuarioActual.rol !== Rol.ESTUDIANTE) {
    return { success: false, error: "Solo los estudiantes pueden unirse a cursos con código." };
  }

  if (usuarioActual.estado !== EstadoUsuario.ACTIVO) {
    return { success: false, error: "Tu matrícula no está activa. Consulta con tu profesor." };
  }

  const rawCodigo = formData.get("codigo");
  const parsed = unirseSchema.safeParse({ codigo: typeof rawCodigo === "string" ? rawCodigo : "" });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Código inválido." };
  }

  const codigoLimpio = normalizarCodigoCurso(parsed.data.codigo);

  // Se exige el código completo: ni más corto (ver el punto 1 de arriba) ni
  // más largo, que casi siempre es un carácter de más al copiarlo.
  if (codigoLimpio.length !== LARGO_CODIGO_CURSO) {
    return {
      success: false,
      error: `El código tiene ${LARGO_CODIGO_CURSO} caracteres, como ABCD-1234. Revísalo con tu profesor.`,
    };
  }

  // Filtra la base de datos por el comienzo del id —que es de donde sale el
  // código— en vez de traer todos los cursos publicados. `insensitive`
  // porque el id se guarda en minúsculas y el estudiante suele escribir el
  // código en mayúsculas; la comprobación exacta se hace igual abajo.
  // El tipo va escrito y no inferido: en el clon de verificación el cliente
  // de Prisma no está generado, `findMany` devuelve `any`, y al pasarlo a una
  // función genérica TypeScript resuelve `T` como `{ id: string }` y se
  // pierden `titulo` y `tutor`. Es el tropiezo que `AGENTS.md` anota como
  // repetido — acá lo atrapó el clon antes del CI.
  type CursoCandidato = {
    id: string;
    titulo: string;
    tutor: { espacioId: string | null };
  };

  const cursosCandidatos: CursoCandidato[] = await prisma.courses.findMany({
    where: {
      estado: EstadoCurso.PUBLICADO,
      id: filtroPorCodigoCurso(codigoLimpio),
    },
    select: {
      id: true,
      titulo: true,
      tutor: { select: { espacioId: true } },
    },
  });

  const coincidencias = cursosQueCoinciden(cursosCandidatos, codigoLimpio);

  if (coincidencias.length === 0) {
    return {
      success: false,
      error: "No se encontró ningún curso activo con ese código. Confírmalo con tu profesor.",
    };
  }

  if (coincidencias.length > 1) {
    // Ver el punto 2 de la cabecera: antes se elegía uno cualquiera.
    return {
      success: false,
      error: "Ese código corresponde a más de un curso. Pídele a tu profesor que lo verifique.",
    };
  }

  const curso = coincidencias[0];

  // Verificamos si ya está inscrito
  const inscripcionPrevia = await prisma.courseUsers.findUnique({
    where: {
      courseId_userId: {
        courseId: curso.id,
        userId: usuarioActual.id,
      },
    },
  });

  if (inscripcionPrevia) {
    return {
      success: true,
      courseId: curso.id,
      titulo: curso.titulo,
      yaInscrito: true,
    };
  }

  try {
    // Inscribimos al estudiante
    await prisma.courseUsers.create({
      data: {
        courseId: curso.id,
        userId: usuarioActual.id,
      },
    });

    // Si el estudiante no tenía espacio de origen, lo asociamos al espacio
    // del tutor. Es el campo de US50: dice dónde nació la cuenta, no a quién
    // pertenece. Solo se escribe cuando está vacío —nunca se reasigna—, para
    // que entrar con el código de otro colegio no le cambie el espacio de
    // origen a un estudiante que ya lo tenía.
    if (!usuarioActual.espacioOrigenId && curso.tutor.espacioId) {
      await prisma.users.update({
        where: { id: usuarioActual.id },
        data: { espacioOrigenId: curso.tutor.espacioId },
      });
    }

    revalidatePath("/estudiante");
    revalidatePath(`/estudiante/cursos/${curso.id}`);

    return {
      success: true,
      courseId: curso.id,
      titulo: curso.titulo,
      yaInscrito: false,
    };
  } catch (error) {
    // Antes era un `catch {}` que se tragaba el error sin registrarlo: si
    // esto falla en producción, el estudiante ve un mensaje y en el servidor
    // no queda rastro de por qué.
    console.error("[unirseACursoConCodigo] falló la inscripción", error);
    return {
      success: false,
      error: "Ocurrió un error al procesar tu inscripción. Intenta de nuevo.",
    };
  }
}
