"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Publica o retira un quiz (19/11/2026). Nace oculto al crearse, así que
 * este es el paso con el que el Tutor lo hace visible una vez le cargó las
 * preguntas; mismo patrón que `toggle-content-visibility` para el
 * contenido (US12).
 *
 * No se deja publicar un quiz sin preguntas: para el estudiante sería una
 * pantalla vacía, y un intento con 0 preguntas no se puede calificar.
 */
const alternarSchema = z.object({
  quizId: z.string().min(1, "Evaluación inválida"),
});

type ResultadoAlternar = { success: true; visible: boolean } | { success: false; error: string };

export async function alternarVisibilidadQuiz(
  _prevState: ResultadoAlternar | null,
  formData: FormData
): Promise<ResultadoAlternar> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede publicar una evaluación." };
  }

  const parsed = alternarSchema.safeParse({ quizId: formData.get("quizId") });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const quiz = await prisma.quizzes.findUnique({
    where: { id: parsed.data.quizId },
    include: { course: true, _count: { select: { preguntas: true } } },
  });

  if (!quiz || quiz.course.tutorId !== usuarioActual.id) {
    return { success: false, error: "Esta evaluación no existe o no te pertenece." };
  }

  if (!quiz.visible && quiz._count.preguntas === 0) {
    return { success: false, error: "Agrega al menos una pregunta antes de publicarla." };
  }

  try {
    const actualizado = await prisma.quizzes.update({
      where: { id: quiz.id },
      data: { visible: !quiz.visible },
    });

    revalidatePath(`/tutor/cursos/${quiz.courseId}/quizzes/${quiz.id}`);
    revalidatePath(`/tutor/cursos/${quiz.courseId}`);
    revalidatePath(`/estudiante/cursos/${quiz.courseId}`);

    return { success: true, visible: actualizado.visible };
  } catch (error) {
    console.error("Error cambiando la visibilidad del quiz:", error);
    return { success: false, error: "No se pudo cambiar el estado. Intenta de nuevo." };
  }
}
