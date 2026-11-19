"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * El Tutor califica la entrega de un estudiante (19/11/2026): nota sobre el
 * puntaje máximo de la actividad, más una retroalimentación opcional.
 *
 * La nota se valida contra el `puntajeMaximo` de la actividad, no contra un
 * número fijo, porque cada actividad define el suyo. Se permiten decimales
 * (4.5 sobre 5 es lo normal en el colegio).
 */
const calificarSchema = z.object({
  entregaId: z.string().min(1, "Entrega inválida"),
  nota: z.coerce.number().min(0, "La nota no puede ser negativa"),
  retroalimentacion: z.string().trim().optional(),
});

type ResultadoCalificar = { success: true } | { success: false; error: string };

export async function calificarEntrega(
  _prevState: ResultadoCalificar | null,
  formData: FormData
): Promise<ResultadoCalificar> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede calificar." };
  }

  const parsed = calificarSchema.safeParse({
    entregaId: formData.get("entregaId"),
    nota: formData.get("nota"),
    retroalimentacion: formData.get("retroalimentacion") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { entregaId, nota, retroalimentacion } = parsed.data;

  const entrega = await prisma.entregas.findUnique({
    where: { id: entregaId },
    include: { actividad: { include: { course: true } } },
  });

  if (!entrega) {
    return { success: false, error: "Esta entrega ya no existe." };
  }

  // El curso de la actividad debe ser del tutor autenticado: sin esto, un
  // tutor podría calificar entregas de cursos ajenos conociendo el id.
  if (entrega.actividad.course.tutorId !== usuarioActual.id) {
    return { success: false, error: "Esta entrega no pertenece a un curso tuyo." };
  }

  if (nota > entrega.actividad.puntajeMaximo) {
    return {
      success: false,
      error: `La nota no puede pasar del puntaje máximo (${entrega.actividad.puntajeMaximo}).`,
    };
  }

  try {
    await prisma.entregas.update({
      where: { id: entregaId },
      data: {
        nota,
        retroalimentacion: retroalimentacion || null,
        calificadaEn: new Date(),
      },
    });

    revalidatePath(`/tutor/cursos/${entrega.actividad.courseId}/actividades/${entrega.actividadId}`);
    revalidatePath(`/estudiante/cursos/${entrega.actividad.courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error calificando la entrega:", error);
    return { success: false, error: "No se pudo guardar la calificación. Intenta de nuevo." };
  }
}
