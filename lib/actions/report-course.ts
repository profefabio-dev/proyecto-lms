"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const esquemaReporte = z.object({
  courseId: z.string().min(1, "Curso no especificado"),
  motivo: z.string().trim().min(3, "El motivo debe tener al menos 3 caracteres").max(100, "El motivo es demasiado largo"),
  detalles: z.string().trim().max(1000, "Los detalles no pueden exceder 1000 caracteres").optional(),
});

export type ResultadoReporte =
  | { success: true; mensaje: string }
  | { success: false; error: string };

/**
 * US49: Permite a un Tutor reportar un curso compartido en el catálogo si
 * contiene material inapropiado para menores, derechos infringidos o lenguaje ofensivo.
 */
export async function reportarCurso(
  _prevState: ResultadoReporte | null,
  formData: FormData
): Promise<ResultadoReporte> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para reportar un curso." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo los tutores pueden reportar cursos del catálogo." };
  }

  const parsed = esquemaReporte.safeParse({
    courseId: formData.get("courseId"),
    motivo: formData.get("motivo"),
    detalles: formData.get("detalles") || undefined,
  });

  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Datos del reporte inválidos.";
    return { success: false, error: errorMsg };
  }

  const { courseId, motivo, detalles } = parsed.data;

  const curso = await prisma.courses.findUnique({
    where: { id: courseId },
    select: { id: true, tutorId: true, compartible: true },
  });

  if (!curso || !curso.compartible) {
    return { success: false, error: "El curso no existe o no está en el catálogo compartido." };
  }

  if (curso.tutorId === usuarioActual.id) {
    return { success: false, error: "No puedes reportar tu propio curso." };
  }

  try {
    await prisma.reportesCurso.create({
      data: {
        courseId,
        tutorId: usuarioActual.id,
        motivo,
        detalles: detalles || null,
      },
    });

    revalidatePath(`/tutor/catalogo/${courseId}`);

    return {
      success: true,
      mensaje: "Reporte enviado correctamente. El equipo de moderación revisará el curso.",
    };
  } catch (err) {
    console.error("Error al registrar reporte de curso:", err);
    return { success: false, error: "Ocurrió un error al guardar el reporte. Inténtalo de nuevo." };
  }
}
