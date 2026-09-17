"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";

const desinscribirSchema = z.object({
  courseId: z.string().trim().min(1, "Falta el curso."),
  estudianteIds: z
    .array(z.string().trim().min(1))
    .min(1, "No hay estudiantes seleccionados."),
});

export type ResultadoDesinscribir =
  | { success: true; quitados: number }
  | { success: false; error: string };

/**
 * Permite a un Tutor quitar uno o varios estudiantes de un curso propio —
 * pedido explícito del docente (16/09/2026): una vez asignado un
 * estudiante a un curso, no había ninguna opción para quitarlo.
 *
 * A propósito, esto SOLO borra la fila de inscripción (`CourseUsers`),
 * nunca la cuenta del estudiante ni su historial en otros cursos: un
 * Estudiante es una cuenta compartida entre Tutores (US26, decisión ya
 * documentada), así que quitarlo de este curso no debe afectar su
 * relación con ningún otro curso o Tutor. El docente confirmó
 * explícitamente este alcance ("solo quitarlo de mis cursos") frente a
 * la alternativa de borrar la cuenta de verdad.
 */
export async function desinscribirEstudiantes(
  _prevState: ResultadoDesinscribir | null,
  formData: FormData
): Promise<ResultadoDesinscribir> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede quitar estudiantes de un curso." };
  }

  const parsed = desinscribirSchema.safeParse({
    courseId: formData.get("courseId"),
    estudianteIds: formData.getAll("estudianteIds"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { courseId, estudianteIds } = parsed.data;

  // Mismo chequeo de propiedad que asignarEstudiantes (US11): un Tutor
  // solo puede modificar las inscripciones de sus propios cursos, aunque
  // conozca el ID de uno ajeno.
  const curso = await prisma.courses.findUnique({ where: { id: courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no existe o no te pertenece." };
  }

  let resultado: { count: number };
  try {
    resultado = await prisma.courseUsers.deleteMany({
      where: { courseId, userId: { in: estudianteIds } },
    });
  } catch (error) {
    console.error("Error quitando estudiantes de un curso:", error);
    return { success: false, error: "No se pudo actualizar la inscripción. Intenta de nuevo." };
  }

  revalidatePath(`/tutor/cursos/${courseId}`);

  return { success: true, quitados: resultado.count };
}
