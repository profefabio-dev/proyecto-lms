"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/** US30: el Tutor cambia el título de una sección que ya creó. */
const renombrarSeccionSchema = z.object({
  seccionId: z.string().min(1, "Sección inválida"),
  titulo: z.string().min(3, "El título debe tener al menos 3 caracteres"),
});

type ResultadoRenombrarSeccion = { success: true } | { success: false; error: string };

export async function renombrarSeccion(
  _prevState: ResultadoRenombrarSeccion | null,
  formData: FormData
): Promise<ResultadoRenombrarSeccion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede renombrar secciones." };
  }

  const parsed = renombrarSeccionSchema.safeParse({
    seccionId: formData.get("seccionId"),
    titulo: formData.get("titulo"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { seccionId, titulo } = parsed.data;

  const seccion = await prisma.secciones.findUnique({ where: { id: seccionId } });

  if (!seccion) {
    return { success: false, error: "Esta sección no existe." };
  }

  const curso = await prisma.courses.findUnique({ where: { id: seccion.courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no te pertenece." };
  }

  try {
    await prisma.secciones.update({ where: { id: seccionId }, data: { titulo } });

    revalidatePath(`/tutor/cursos/${seccion.courseId}`);
    revalidatePath(`/estudiante/cursos/${seccion.courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error renombrando sección:", error);
    return { success: false, error: "No se pudo renombrar la sección. Intenta de nuevo." };
  }
}
