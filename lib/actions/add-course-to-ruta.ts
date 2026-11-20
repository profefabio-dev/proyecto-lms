"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol, EstadoCurso } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const agregarCursoSchema = z.object({
  rutaId: z.string().min(1, "Ruta inválida"),
  courseId: z.string().min(1, "Selecciona un curso"),
});

type ResultadoAgregarCurso =
  | { success: true; inscritosNuevos: number }
  | { success: false; error: string };

/**
 * US44: el Tutor agrega uno de sus cursos al final de una ruta.
 *
 * Lo no obvio: si la ruta ya tiene estudiantes asociados, hay que
 * inscribirlos también en el curso nuevo. Sin esto, un estudiante que se
 * asoció a la ruta en octubre vería en noviembre un curso en su ruta al que
 * no puede entrar (US11 exige la fila en `CourseUsers`) — un callejón sin
 * salida difícil de diagnosticar desde la interfaz. Solo se inscribe en
 * cursos PUBLICADOS: un borrador no debe llegarle a nadie todavía.
 */
export async function agregarCursoARuta(
  _prevState: ResultadoAgregarCurso | null,
  formData: FormData
): Promise<ResultadoAgregarCurso> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede modificar una ruta." };
  }

  const parsed = agregarCursoSchema.safeParse({
    rutaId: formData.get("rutaId"),
    courseId: formData.get("courseId"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { rutaId, courseId } = parsed.data;

  const [ruta, curso] = await Promise.all([
    prisma.rutas.findUnique({ where: { id: rutaId } }),
    prisma.courses.findUnique({ where: { id: courseId } }),
  ]);

  if (!ruta || ruta.tutorId !== usuarioActual.id) {
    return { success: false, error: "Esta ruta no existe o no te pertenece." };
  }

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no existe o no te pertenece." };
  }

  const yaEsta = await prisma.rutaCursos.findUnique({
    where: { rutaId_courseId: { rutaId, courseId } },
  });

  if (yaEsta) {
    return { success: false, error: "Ese curso ya forma parte de la ruta." };
  }

  try {
    const total = await prisma.rutaCursos.count({ where: { rutaId } });

    await prisma.rutaCursos.create({ data: { rutaId, courseId, orden: total } });

    // Poner al día a quienes ya venían recorriendo la ruta.
    let inscritosNuevos = 0;

    if (curso.estado === EstadoCurso.PUBLICADO) {
      const enLaRuta = await prisma.rutaUsuarios.findMany({
        where: { rutaId },
        select: { userId: true },
      });

      if (enLaRuta.length > 0) {
        const resultado = await prisma.courseUsers.createMany({
          data: enLaRuta.map((inscrito) => ({ courseId, userId: inscrito.userId })),
          skipDuplicates: true,
        });
        inscritosNuevos = resultado.count;
      }
    }

    revalidatePath(`/tutor/rutas/${rutaId}`);
    revalidatePath("/tutor/rutas");
    revalidatePath("/estudiante/rutas");
    revalidatePath("/estudiante");

    return { success: true, inscritosNuevos };
  } catch (error) {
    console.error("Error agregando curso a la ruta:", error);
    return { success: false, error: "No se pudo agregar el curso. Intenta de nuevo." };
  }
}
