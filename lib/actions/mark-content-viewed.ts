"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { registrarContenidosVistos } from "@/lib/progress-tracking";

const marcarVistoSchema = z.object({
  contentId: z.string().trim().min(1, "Falta el contenido."),
});

/**
 * US19 (rediseño) — el Estudiante marca manualmente un contenido como
 * visto con un botón, uno por contenido.
 *
 * Reemplaza el primer diseño (marcar automático al abrir la página del
 * curso): en la práctica, como los contenidos de un curso se muestran
 * todos juntos en una sola página, ese diseño marcaba TODOS como vistos
 * con solo cargar la página, sin que el estudiante interactuara con
 * ninguno — el docente lo detectó probándolo (ver la nota en
 * `progress.md`) y se decidió cambiarlo por esto: solo cuenta como visto
 * lo que el estudiante confirma explícitamente.
 */
export async function marcarContenidoVisto(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false as const, error: "No autenticado." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== "ESTUDIANTE") {
    return { success: false as const, error: "No autorizado." };
  }

  const parsed = marcarVistoSchema.safeParse({ contentId: formData.get("contentId") });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const contenido = await prisma.contents.findUnique({
    where: { id: parsed.data.contentId },
  });

  if (!contenido || !contenido.visible) {
    return { success: false as const, error: "El contenido no existe." };
  }

  // Mismo chequeo de inscripción que ya hace la página de detalle (US11):
  // no basta con que el contenido exista, el estudiante tiene que estar
  // inscrito en el curso al que pertenece.
  const inscripcion = await prisma.courseUsers.findFirst({
    where: { courseId: contenido.courseId, userId: usuarioActual.id },
  });

  if (!inscripcion) {
    return { success: false as const, error: "No estás inscrito en este curso." };
  }

  await registrarContenidosVistos(usuarioActual.id, [contenido.id]);

  revalidatePath(`/estudiante/cursos/${contenido.courseId}`);
  revalidatePath("/estudiante");

  return { success: true as const };
}
