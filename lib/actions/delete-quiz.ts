"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * OP08 (21/11/2026): el Tutor elimina una evaluación.
 *
 * Misma falta que en las actividades (ver `delete-activity.ts`): se podían
 * crear pero no deshacer. Aquí no hay archivos en Storage, pero sí cuatro
 * tablas encadenadas, así que el borrado va en una transacción y **de la
 * hoja a la raíz**, respetando las claves foráneas: primero las opciones de
 * cada pregunta, después las preguntas, después los intentos de los
 * estudiantes y por último la evaluación.
 *
 * Los intentos son trabajo real de los estudiantes y sus resultados
 * aparecen en "Mis notas", así que se pierden al borrar: la acción devuelve
 * cuántos eran y la interfaz lo muestra antes de la segunda confirmación.
 */
const eliminarQuizSchema = z.object({
  quizId: z.string().min(1, "Evaluación inválida"),
});

type ResultadoEliminarQuiz =
  | { success: true; intentosBorrados: number }
  | { success: false; error: string };

export async function eliminarQuiz(
  _prevState: ResultadoEliminarQuiz | null,
  formData: FormData
): Promise<ResultadoEliminarQuiz> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede eliminar evaluaciones." };
  }

  const parsed = eliminarQuizSchema.safeParse({ quizId: formData.get("quizId") });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const quiz = await prisma.quizzes.findUnique({
    where: { id: parsed.data.quizId },
    include: {
      course: true,
      preguntas: { select: { id: true } },
      _count: { select: { intentos: true } },
    },
  });

  if (!quiz) {
    return { success: false, error: "Esta evaluación no existe." };
  }

  if (quiz.course.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no te pertenece." };
  }

  const idsPreguntas = quiz.preguntas.map((pregunta) => pregunta.id);

  try {
    await prisma.$transaction([
      prisma.opcionesQuiz.deleteMany({ where: { preguntaId: { in: idsPreguntas } } }),
      prisma.preguntasQuiz.deleteMany({ where: { quizId: quiz.id } }),
      prisma.intentosQuiz.deleteMany({ where: { quizId: quiz.id } }),
      prisma.quizzes.delete({ where: { id: quiz.id } }),
    ]);
  } catch (error) {
    console.error("Error eliminando la evaluación:", error);
    return { success: false, error: "No se pudo eliminar la evaluación. Intenta de nuevo." };
  }

  revalidatePath(`/tutor/cursos/${quiz.courseId}`);
  revalidatePath(`/tutor/cursos/${quiz.courseId}/seguimiento`);
  revalidatePath(`/estudiante/cursos/${quiz.courseId}`);
  revalidatePath("/estudiante/notas");

  return { success: true, intentosBorrados: quiz._count.intentos };
}
