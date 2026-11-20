"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const quitarCursoSchema = z.object({
  rutaId: z.string().min(1, "Ruta inválida"),
  courseId: z.string().min(1, "Curso inválido"),
});

type ResultadoQuitarCurso = { success: true } | { success: false; error: string };

/**
 * US44: el Tutor saca un curso de una ruta.
 *
 * Importante lo que NO hace: no desinscribe a nadie del curso. Si un
 * estudiante ya venía estudiándolo, quitarlo de la ruta le borraría de un
 * golpe su avance y sus entregas en ese curso. Sacarlo de la ruta solo
 * cambia el camino de aquí en adelante; quien quiera desinscribir a un
 * estudiante de un curso tiene la pantalla del curso para eso
 * (`unenroll-students.ts`).
 *
 * Tras quitarlo se renumeran los demás (0,1,2...) para que `orden` no quede
 * con huecos y el siguiente curso que se agregue no choque de posición.
 */
export async function quitarCursoDeRuta(
  _prevState: ResultadoQuitarCurso | null,
  formData: FormData
): Promise<ResultadoQuitarCurso> {
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

  const parsed = quitarCursoSchema.safeParse({
    rutaId: formData.get("rutaId"),
    courseId: formData.get("courseId"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { rutaId, courseId } = parsed.data;

  const ruta = await prisma.rutas.findUnique({ where: { id: rutaId } });

  if (!ruta || ruta.tutorId !== usuarioActual.id) {
    return { success: false, error: "Esta ruta no existe o no te pertenece." };
  }

  try {
    await prisma.rutaCursos.deleteMany({ where: { rutaId, courseId } });

    const restantes = await prisma.rutaCursos.findMany({
      where: { rutaId },
      orderBy: { orden: "asc" },
      select: { id: true },
    });

    await prisma.$transaction(
      restantes.map((fila, posicion) =>
        prisma.rutaCursos.update({ where: { id: fila.id }, data: { orden: posicion } })
      )
    );

    revalidatePath(`/tutor/rutas/${rutaId}`);
    revalidatePath("/tutor/rutas");
    revalidatePath("/estudiante/rutas");

    return { success: true };
  } catch (error) {
    console.error("Error quitando curso de la ruta:", error);
    return { success: false, error: "No se pudo quitar el curso. Intenta de nuevo." };
  }
}
