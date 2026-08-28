"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol, TipoContenido } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const crearContenidoTextoSchema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
  titulo: z.string().trim().min(2, "El título es obligatorio"),
  descripcion: z.string().trim().optional(),
  // El contenido se guarda en formato Markdown (admite títulos con "#",
  // listas con "-" y negrita con "**texto**"); se renderiza en el curso
  // con react-markdown, tanto para el Tutor como para el Estudiante.
  contenido: z.string().trim().min(2, "El contenido es obligatorio"),
});

type ResultadoCrearContenidoTexto =
  | { success: true; contenidoId: string }
  | { success: false; error: string };

export async function crearContenidoTexto(
  _prevState: ResultadoCrearContenidoTexto | null,
  formData: FormData
): Promise<ResultadoCrearContenidoTexto> {
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
  const parsed = crearContenidoTextoSchema.safeParse({
    courseId: formData.get("courseId"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || undefined,
    contenido: formData.get("contenido"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { courseId, titulo, descripcion, contenido } = parsed.data;

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
        tipo: TipoContenido.TEXTO,
        contenido,
        orden: totalContenidos,
      },
    });

    revalidatePath(`/tutor/cursos/${courseId}`);
    revalidatePath(`/estudiante/cursos/${courseId}`);

    return { success: true, contenidoId: nuevoContenido.id };
  } catch (error) {
    console.error("Error creando contenido de texto:", error);
    return { success: false, error: "No se pudo publicar el contenido. Intenta de nuevo." };
  }
}
