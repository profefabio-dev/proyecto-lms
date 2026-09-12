"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US30: el Tutor fija a mano si una sección está Disponible o No disponible
 * para el Estudiante — mismo patrón que `alternarVisibilidadContenido`
 * (US12): no se calcula por fecha, decisión acordada con el docente
 * (08/09/2026) porque no todos los cursos siguen un calendario semanal
 * real.
 */
const alternarEstadoSeccionSchema = z.object({
  seccionId: z.string().min(1, "Sección inválida"),
});

type ResultadoAlternarEstadoSeccion = { success: true } | { success: false; error: string };

export async function alternarEstadoSeccion(
  _prevState: ResultadoAlternarEstadoSeccion | null,
  formData: FormData
): Promise<ResultadoAlternarEstadoSeccion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede cambiar el estado de una sección." };
  }

  const parsed = alternarEstadoSeccionSchema.safeParse({ seccionId: formData.get("seccionId") });

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
    await prisma.secciones.update({
      where: { id: seccionId },
      data: { estado: seccion.estado === "DISPONIBLE" ? "NO_DISPONIBLE" : "DISPONIBLE" },
    });

    revalidatePath(`/tutor/cursos/${seccion.courseId}`);
    revalidatePath(`/estudiante/cursos/${seccion.courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error cambiando estado de sección:", error);
    return { success: false, error: "No se pudo actualizar el estado. Intenta de nuevo." };
  }
}
