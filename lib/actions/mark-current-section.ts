"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US30: el Tutor marca, de forma opcional, cuál sección es la "semana
 * actual" del curso — una sola a la vez. Un segundo clic sobre la sección ya
 * marcada la desmarca (queda sin ninguna semana actual); marcar una distinta
 * desmarca automáticamente la anterior, todo dentro de una transacción para
 * que nunca queden dos secciones marcadas a la vez.
 */
const marcarSeccionActualSchema = z.object({
  seccionId: z.string().min(1, "Sección inválida"),
});

type ResultadoMarcarSeccionActual = { success: true } | { success: false; error: string };

export async function marcarSeccionActual(
  _prevState: ResultadoMarcarSeccionActual | null,
  formData: FormData
): Promise<ResultadoMarcarSeccionActual> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede marcar la semana actual." };
  }

  const parsed = marcarSeccionActualSchema.safeParse({ seccionId: formData.get("seccionId") });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { seccionId } = parsed.data;

  const seccion = await prisma.secciones.findUnique({ where: { id: seccionId } });

  if (!seccion) {
    return { success: false, error: "Esta sección no existe." };
  }

  const curso = await prisma.courses.findUnique({ where: { id: seccion.courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no te pertenece." };
  }

  try {
    if (seccion.esActual) {
      await prisma.secciones.update({ where: { id: seccionId }, data: { esActual: false } });
    } else {
      await prisma.$transaction([
        prisma.secciones.updateMany({
          where: { courseId: seccion.courseId, esActual: true },
          data: { esActual: false },
        }),
        prisma.secciones.update({ where: { id: seccionId }, data: { esActual: true } }),
      ]);
    }

    revalidatePath(`/tutor/cursos/${seccion.courseId}`);
    revalidatePath(`/estudiante/cursos/${seccion.courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error marcando sección como semana actual:", error);
    return { success: false, error: "No se pudo actualizar la semana actual. Intenta de nuevo." };
  }
}
