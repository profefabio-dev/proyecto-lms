"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US53 — el Tutor publica un anuncio en un curso suyo (25/11/2026).
 *
 * Es la pieza que faltaba del bloque de novedades: lo de OP11 es
 * **automático** (plazos, notas, material nuevo) y no había forma de que el
 * docente dijera algo con sus propias palabras.
 *
 * El cuerpo va en Markdown, igual que las instrucciones de una actividad
 * (US36), y se renderiza con `MarkdownContent` — nunca como HTML crudo, que
 * sería una vía de XSS con texto escrito por un Tutor.
 *
 * No se avisa a nadie por correo ni por notificación: la plataforma no
 * manda correos, y el anuncio aparece donde el estudiante ya mira, que es
 * su panel y la portada del curso.
 */
const crearAnuncioSchema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
  titulo: z
    .string()
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(120, "El título no puede pasar de 120 caracteres"),
  cuerpo: z.string().trim().min(5, "Escribe el anuncio"),
});

type ResultadoCrearAnuncio = { success: true } | { success: false; error: string };

export async function crearAnuncio(
  _prevState: ResultadoCrearAnuncio | null,
  formData: FormData
): Promise<ResultadoCrearAnuncio> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede publicar anuncios." };
  }

  const parsed = crearAnuncioSchema.safeParse({
    courseId: formData.get("courseId"),
    titulo: formData.get("titulo"),
    cuerpo: formData.get("cuerpo"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { courseId, titulo, cuerpo } = parsed.data;

  const curso = await prisma.courses.findUnique({ where: { id: courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no existe o no te pertenece." };
  }

  try {
    await prisma.anuncios.create({
      data: { courseId, tutorId: usuarioActual.id, titulo, cuerpo },
    });

    revalidatePath(`/tutor/cursos/${courseId}`);
    revalidatePath(`/estudiante/cursos/${courseId}`);
    // El panel del Estudiante, donde vive el bloque de novedades.
    revalidatePath("/estudiante");

    return { success: true };
  } catch (error) {
    console.error("Error creando el anuncio:", error);
    return { success: false, error: "No se pudo publicar el anuncio. Intenta de nuevo." };
  }
}
