"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US12: el Tutor muestra u oculta un contenido del curso. El filtro que
 * respeta `visible` del lado del Estudiante ya existía desde US15/US16
 * (`app/estudiante/cursos/[courseId]/page.tsx` solo lista contenidos con
 * `visible: true`) — lo que faltaba era darle al Tutor una forma de
 * cambiar ese valor desde la interfaz.
 */
const alternarVisibilidadSchema = z.object({
  contentId: z.string().min(1, "Contenido inválido"),
});

type ResultadoAlternarVisibilidad = { success: true } | { success: false; error: string };

export async function alternarVisibilidadContenido(
  _prevState: ResultadoAlternarVisibilidad | null,
  formData: FormData
): Promise<ResultadoAlternarVisibilidad> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede mostrar u ocultar contenido." };
  }

  const parsed = alternarVisibilidadSchema.safeParse({ contentId: formData.get("contentId") });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { contentId } = parsed.data;

  const contenido = await prisma.contents.findUnique({ where: { id: contentId } });

  if (!contenido) {
    return { success: false, error: "Este contenido no existe." };
  }

  const curso = await prisma.courses.findUnique({ where: { id: contenido.courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no te pertenece." };
  }

  try {
    await prisma.contents.update({
      where: { id: contentId },
      data: { visible: !contenido.visible },
    });

    revalidatePath(`/tutor/cursos/${contenido.courseId}`);
    revalidatePath(`/estudiante/cursos/${contenido.courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error cambiando visibilidad de contenido:", error);
    return { success: false, error: "No se pudo actualizar la visibilidad. Intenta de nuevo." };
  }
}
