"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US30: el Tutor reordena las secciones de un curso — mismo mecanismo que
 * `moverContenido` (US12): intercambia el `orden` con el vecino inmediato en
 * la dirección pedida, dentro del mismo curso. Si ya está en un extremo, no
 * hay vecino y no se hace nada.
 */
const moverSeccionSchema = z.object({
  seccionId: z.string().min(1, "Sección inválida"),
  direccion: z.enum(["arriba", "abajo"]),
});

type ResultadoMoverSeccion = { success: true } | { success: false; error: string };

export async function moverSeccion(
  _prevState: ResultadoMoverSeccion | null,
  formData: FormData
): Promise<ResultadoMoverSeccion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede reordenar secciones." };
  }

  const parsed = moverSeccionSchema.safeParse({
    seccionId: formData.get("seccionId"),
    direccion: formData.get("direccion"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { seccionId, direccion } = parsed.data;

  // Corrección de rendimiento (12/09/2026): antes eran dos consultas
  // seguidas (la sección, y por separado su curso, solo para verificar el
  // dueño) — dos viajes de red completos a la base de datos remota antes
  // de poder hacer nada más. El docente reportó que mover una sección "se
  // demora mucho"; se combinan en una sola consulta con `include`, ya que
  // la relación entre sección y curso ya existe en el esquema.
  const seccion = await prisma.secciones.findUnique({
    where: { id: seccionId },
    include: { course: true },
  });

  if (!seccion) {
    return { success: false, error: "Esta sección no existe." };
  }

  if (seccion.course.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no te pertenece." };
  }

  const vecino = await prisma.secciones.findFirst({
    where: {
      courseId: seccion.courseId,
      orden: direccion === "arriba" ? { lt: seccion.orden } : { gt: seccion.orden },
    },
    orderBy: { orden: direccion === "arriba" ? "desc" : "asc" },
  });

  if (!vecino) {
    // Ya está en el extremo de la lista; no hay nada que intercambiar.
    return { success: true };
  }

  try {
    await prisma.$transaction([
      prisma.secciones.update({ where: { id: seccion.id }, data: { orden: vecino.orden } }),
      prisma.secciones.update({ where: { id: vecino.id }, data: { orden: seccion.orden } }),
    ]);

    revalidatePath(`/tutor/cursos/${seccion.courseId}`);
    revalidatePath(`/estudiante/cursos/${seccion.courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error reordenando sección:", error);
    return { success: false, error: "No se pudo reordenar la sección. Intenta de nuevo." };
  }
}
