"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * El Tutor agrega una pregunta de opción múltiple a un quiz suyo
 * (19/11/2026): enunciado, entre 2 y 4 opciones, y cuál es la correcta.
 *
 * La opción correcta llega como índice (`correcta`) y no como texto, para
 * no depender de que dos opciones no se repitan.
 */
const agregarPreguntaSchema = z.object({
  quizId: z.string().min(1, "Evaluación inválida"),
  enunciado: z.string().trim().min(5, "El enunciado debe tener al menos 5 caracteres"),
  correcta: z.coerce.number().int().min(0).max(3),
});

type ResultadoAgregarPregunta = { success: true } | { success: false; error: string };

export async function agregarPreguntaQuiz(
  _prevState: ResultadoAgregarPregunta | null,
  formData: FormData
): Promise<ResultadoAgregarPregunta> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede editar una evaluación." };
  }

  const parsed = agregarPreguntaSchema.safeParse({
    quizId: formData.get("quizId"),
    enunciado: formData.get("enunciado"),
    correcta: formData.get("correcta"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { quizId, enunciado, correcta } = parsed.data;

  // Las opciones llegan como opcion0..opcion3; las vacías se descartan, de
  // modo que una pregunta de dos opciones (verdadero/falso) también sirve.
  const opciones = [0, 1, 2, 3]
    .map((indice) => ({
      indice,
      texto: String(formData.get(`opcion${indice}`) ?? "").trim(),
    }))
    .filter((opcion) => opcion.texto.length > 0);

  if (opciones.length < 2) {
    return { success: false, error: "Escribe al menos dos opciones de respuesta." };
  }

  if (!opciones.some((opcion) => opcion.indice === correcta)) {
    return { success: false, error: "Marca cuál de las opciones que escribiste es la correcta." };
  }

  const quiz = await prisma.quizzes.findUnique({
    where: { id: quizId },
    include: { course: true },
  });

  if (!quiz || quiz.course.tutorId !== usuarioActual.id) {
    return { success: false, error: "Esta evaluación no existe o no te pertenece." };
  }

  try {
    const totalPreguntas = await prisma.preguntasQuiz.count({ where: { quizId } });

    await prisma.preguntasQuiz.create({
      data: {
        quizId,
        enunciado,
        orden: totalPreguntas,
        opciones: {
          create: opciones.map((opcion, posicion) => ({
            texto: opcion.texto,
            esCorrecta: opcion.indice === correcta,
            orden: posicion,
          })),
        },
      },
    });

    revalidatePath(`/tutor/cursos/${quiz.courseId}/quizzes/${quizId}`);
    revalidatePath(`/estudiante/cursos/${quiz.courseId}/quizzes/${quizId}`);

    return { success: true };
  } catch (error) {
    console.error("Error agregando la pregunta:", error);
    return { success: false, error: "No se pudo agregar la pregunta. Intenta de nuevo." };
  }
}
