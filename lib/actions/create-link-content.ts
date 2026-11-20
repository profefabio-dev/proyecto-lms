"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol, TipoContenido } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US45: el Tutor publica un recurso externo (ENLACE).
 *
 * Mismo esqueleto que `crearContenidoVideo`, con una diferencia: aquí no se
 * exige YouTube, cualquier URL http/https sirve — una simulación de física,
 * un artículo, una herramienta en línea. Se exige el esquema explícito
 * porque un "www.ejemplo.com" sin protocolo el navegador lo interpretaría
 * como una ruta interna del sitio y el enlace llevaría a un 404.
 */
const crearContenidoEnlaceSchema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
  titulo: z.string().trim().min(2, "El título es obligatorio"),
  descripcion: z.string().trim().optional(),
  url: z
    .string()
    .trim()
    .url("La URL no es válida")
    .refine((valor) => valor.startsWith("http://") || valor.startsWith("https://"), {
      message: "La dirección debe empezar por http:// o https://",
    }),
});

type ResultadoCrearContenidoEnlace =
  | { success: true; contenidoId: string }
  | { success: false; error: string };

export async function crearContenidoEnlace(
  _prevState: ResultadoCrearContenidoEnlace | null,
  formData: FormData
): Promise<ResultadoCrearContenidoEnlace> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede publicar contenido." };
  }

  const parsed = crearContenidoEnlaceSchema.safeParse({
    courseId: formData.get("courseId"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || undefined,
    url: formData.get("url"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { courseId, titulo, descripcion, url } = parsed.data;

  const curso = await prisma.courses.findUnique({ where: { id: courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no existe o no te pertenece." };
  }

  try {
    const totalContenidos = await prisma.contents.count({ where: { courseId } });

    const nuevoContenido = await prisma.contents.create({
      data: {
        courseId,
        titulo,
        descripcion: descripcion || null,
        tipo: TipoContenido.ENLACE,
        contenido: url,
        orden: totalContenidos,
      },
    });

    revalidatePath(`/tutor/cursos/${courseId}`);
    revalidatePath(`/estudiante/cursos/${courseId}`);

    return { success: true, contenidoId: nuevoContenido.id };
  } catch (error) {
    console.error("Error creando contenido de enlace:", error);
    return { success: false, error: "No se pudo publicar el enlace. Intenta de nuevo." };
  }
}
