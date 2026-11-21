"use server";

import { revalidatePath } from "next/cache";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * El Estudiante responde un quiz y el sistema lo califica al instante
 * (19/11/2026).
 *
 * La corrección se hace **en el servidor**, comparando contra
 * `OpcionesQuiz.esCorrecta`, que nunca se envía al navegador: si se
 * calificara en el cliente, cualquiera podría leer las respuestas en el
 * HTML o alterar el resultado antes de guardarlo.
 *
 * Cada intento se guarda como un registro nuevo, no se sobrescribe el
 * anterior: repetir un quiz es parte del aprendizaje y el docente quiere
 * ver la evolución.
 */
type ResultadoQuiz =
  | { success: true; intentoId: string; correctas: number; total: number; puntaje: number }
  | { success: false; error: string };

export async function responderQuiz(
  _prevState: ResultadoQuiz | null,
  formData: FormData
): Promise<ResultadoQuiz> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.ESTUDIANTE) {
    return { success: false, error: "Solo un estudiante puede responder una evaluación." };
  }

  const quizId = String(formData.get("quizId") ?? "");

  if (!quizId) {
    return { success: false, error: "Evaluación inválida." };
  }

  const quiz = await prisma.quizzes.findUnique({
    where: { id: quizId },
    include: { preguntas: { include: { opciones: true }, orderBy: { orden: "asc" } } },
  });

  if (!quiz || !quiz.visible) {
    return { success: false, error: "Esta evaluación no está disponible." };
  }

  const inscripcion = await prisma.courseUsers.findFirst({
    where: { courseId: quiz.courseId, userId: usuarioActual.id },
  });

  if (!inscripcion) {
    return { success: false, error: "No estás inscrito en el curso de esta evaluación." };
  }

  if (quiz.preguntas.length === 0) {
    return { success: false, error: "Esta evaluación todavía no tiene preguntas." };
  }

  // OP08 (21/11/2026): límite de intentos, si el Tutor le puso uno.
  // `intentosMaximos` en null significa sin límite, como se comportaban
  // todas las evaluaciones hasta hoy. La verificación va AQUÍ, en el
  // servidor, y no solo escondiendo el formulario en la pantalla: ocultar
  // el botón no impide reenviar la petición a mano.
  if (quiz.intentosMaximos !== null) {
    const intentosPrevios = await prisma.intentosQuiz.count({
      where: { quizId: quiz.id, userId: usuarioActual.id },
    });

    if (intentosPrevios >= quiz.intentosMaximos) {
      return {
        success: false,
        error: `Ya usaste tus ${quiz.intentosMaximos} ${
          quiz.intentosMaximos === 1 ? "intento" : "intentos"
        } en esta evaluación.`,
      };
    }
  }

  // Se exige responder todas: dejar una en blanco casi siempre es un olvido
  // al desplazarse, y es mejor avisar que calificarla como incorrecta.
  const respuestas: Record<string, string> = {};

  for (const pregunta of quiz.preguntas) {
    const elegida = formData.get(`pregunta-${pregunta.id}`);

    if (typeof elegida !== "string" || !elegida) {
      return { success: false, error: "Responde todas las preguntas antes de enviar." };
    }

    // La opción elegida debe pertenecer a esa misma pregunta.
    if (!pregunta.opciones.some((opcion) => opcion.id === elegida)) {
      return { success: false, error: "Hubo un problema con tus respuestas. Vuelve a intentarlo." };
    }

    respuestas[pregunta.id] = elegida;
  }

  const correctas = quiz.preguntas.filter((pregunta) => {
    const elegida = respuestas[pregunta.id];
    return pregunta.opciones.some((opcion) => opcion.id === elegida && opcion.esCorrecta);
  }).length;

  const total = quiz.preguntas.length;
  const puntaje = Math.round((correctas / total) * 100);

  try {
    const intento = await prisma.intentosQuiz.create({
      data: {
        quizId,
        userId: usuarioActual.id,
        respuestas,
        correctas,
        total,
        puntaje,
      },
    });

    revalidatePath(`/estudiante/cursos/${quiz.courseId}/quizzes/${quizId}`);
    revalidatePath(`/estudiante/cursos/${quiz.courseId}`);
    revalidatePath(`/tutor/cursos/${quiz.courseId}/quizzes/${quizId}`);

    return { success: true, intentoId: intento.id, correctas, total, puntaje };
  } catch (error) {
    console.error("Error guardando el intento del quiz:", error);
    return { success: false, error: "No se pudo guardar tu intento. Intenta de nuevo." };
  }
}
