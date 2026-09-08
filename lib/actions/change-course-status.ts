"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Corrección sobre US07/US14: hasta ahora el estado de un curso
 * (Borrador/Publicado/Archivado) solo se podía definir al crearlo — no
 * existía ninguna forma de cambiarlo después sin recrear el curso desde
 * cero, como reportó el docente al intentarlo. Este Server Action permite
 * cambiarlo en cualquier momento, sin tocar el resto de los datos del
 * curso (título, descripción, imagen).
 */
const cambiarEstadoCursoSchema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
  estado: z.enum(["BORRADOR", "PUBLICADO", "ARCHIVADO"]),
});

type ResultadoCambiarEstadoCurso = { success: true } | { success: false; error: string };

export async function cambiarEstadoCurso(
  _prevState: ResultadoCambiarEstadoCurso | null,
  formData: FormData
): Promise<ResultadoCambiarEstadoCurso> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede cambiar el estado de un curso." };
  }

  const parsed = cambiarEstadoCursoSchema.safeParse({
    courseId: formData.get("courseId"),
    estado: formData.get("estado"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { courseId, estado } = parsed.data;

  const curso = await prisma.courses.findUnique({ where: { id: courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no existe o no te pertenece." };
  }

  try {
    await prisma.courses.update({
      where: { id: courseId },
      data: { estado },
    });

    revalidatePath("/tutor/cursos");
    revalidatePath(`/tutor/cursos/${courseId}`);
    revalidatePath("/estudiante");
    revalidatePath(`/estudiante/cursos/${courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error cambiando el estado del curso:", error);
    return { success: false, error: "No se pudo actualizar el estado. Intenta de nuevo." };
  }
}
