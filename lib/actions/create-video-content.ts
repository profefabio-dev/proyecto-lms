"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol, TipoContenido } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { esUrlDeYoutubeValida } from "@/lib/youtube";

const crearContenidoVideoSchema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
  titulo: z.string().trim().min(2, "El título es obligatorio"),
  descripcion: z.string().trim().optional(),
  url: z
    .string()
    .trim()
    .url("La URL no es válida")
    .refine(esUrlDeYoutubeValida, {
      message: "Debe ser un enlace de YouTube válido (youtube.com o youtu.be)",
    }),
});

type ResultadoCrearContenidoVideo =
  | { success: true; contenidoId: string }
  | { success: false; error: string };

export async function crearContenidoVideo(
  _prevState: ResultadoCrearContenidoVideo | null,
  formData: FormData
): Promise<ResultadoCrearContenidoVideo> {
  // 1. Verificar que quien llama sea un Tutor autenticado.
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

  // 2. Validar los datos del formulario en el servidor.
  const parsed = crearContenidoVideoSchema.safeParse({
    courseId: formData.get("courseId"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || undefined,
    url: formData.get("url"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { courseId, titulo, descripcion, url } = parsed.data;

  // 3. El curso debe existir y pertenecer al tutor autenticado.
  const curso = await prisma.courses.findUnique({ where: { id: courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no existe o no te pertenece." };
  }

  try {
    // El nuevo contenido se agrega al final del orden actual del curso.
    const totalContenidos = await prisma.contents.count({ where: { courseId } });

    const nuevoContenido = await prisma.contents.create({
      data: {
        courseId,
        titulo,
        descripcion: descripcion || null,
        tipo: TipoContenido.VIDEO,
        contenido: url,
        orden: totalContenidos,
      },
    });

    revalidatePath(`/tutor/cursos/${courseId}`);

    return { success: true, contenidoId: nuevoContenido.id };
  } catch (error) {
    console.error("Error creando contenido de video:", error);
    return { success: false, error: "No se pudo publicar el video. Intenta de nuevo." };
  }
}
