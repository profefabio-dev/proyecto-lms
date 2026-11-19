"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * El Tutor crea un quiz vacío dentro de un curso suyo (19/11/2026); las
 * preguntas se agregan después, una por una, desde la pantalla del quiz
 * (`agregarPreguntaQuiz`).
 *
 * Nace invisible para los estudiantes a propósito: un quiz sin preguntas no
 * tiene sentido, así que el Tutor lo publica cuando ya lo armó.
 */
const crearQuizSchema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
  seccionId: z.string().optional(),
  titulo: z.string().trim().min(3, "El título debe tener al menos 3 caracteres"),
  descripcion: z.string().trim().optional(),
});

type ResultadoCrearQuiz = { success: true; quizId: string } | { success: false; error: string };

export async function crearQuiz(
  _prevState: ResultadoCrearQuiz | null,
  formData: FormData
): Promise<ResultadoCrearQuiz> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede crear evaluaciones." };
  }

  const parsed = crearQuizSchema.safeParse({
    courseId: formData.get("courseId"),
    seccionId: formData.get("seccionId") || undefined,
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { courseId, seccionId, titulo, descripcion } = parsed.data;

  const curso = await prisma.courses.findUnique({ where: { id: courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no existe o no te pertenece." };
  }

  if (seccionId) {
    const seccion = await prisma.secciones.findUnique({ where: { id: seccionId } });

    if (!seccion || seccion.courseId !== courseId) {
      return { success: false, error: "La sección elegida no pertenece a este curso." };
    }
  }

  try {
    const total = await prisma.quizzes.count({ where: { courseId } });

    const quiz = await prisma.quizzes.create({
      data: {
        courseId,
        seccionId: seccionId ?? null,
        titulo,
        descripcion: descripcion || null,
        visible: false,
        orden: total,
      },
    });

    revalidatePath(`/tutor/cursos/${courseId}`);

    return { success: true, quizId: quiz.id };
  } catch (error) {
    console.error("Error creando el quiz:", error);
    return { success: false, error: "No se pudo crear la evaluación. Intenta de nuevo." };
  }
}
