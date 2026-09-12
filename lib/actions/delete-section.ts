"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US30: el Tutor elimina una sección. Su contenido NO se borra — vuelve a
 * quedar sin sección (`seccionId: null`), el mismo estado en el que ya vive
 * todo el contenido de los cursos que nunca usaron secciones, en vez de
 * perder contenido publicado por eliminar la agrupación que lo contenía.
 */
const eliminarSeccionSchema = z.object({
  seccionId: z.string().min(1, "Sección inválida"),
});

type ResultadoEliminarSeccion = { success: true } | { success: false; error: string };

export async function eliminarSeccion(
  _prevState: ResultadoEliminarSeccion | null,
  formData: FormData
): Promise<ResultadoEliminarSeccion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede eliminar secciones." };
  }

  const parsed = eliminarSeccionSchema.safeParse({ seccionId: formData.get("seccionId") });

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
    await prisma.$transaction([
      prisma.contents.updateMany({ where: { seccionId }, data: { seccionId: null } }),
      prisma.secciones.delete({ where: { id: seccionId } }),
    ]);

    revalidatePath(`/tutor/cursos/${seccion.courseId}`);
    revalidatePath(`/estudiante/cursos/${seccion.courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error eliminando sección:", error);
    return { success: false, error: "No se pudo eliminar la sección. Intenta de nuevo." };
  }
}
