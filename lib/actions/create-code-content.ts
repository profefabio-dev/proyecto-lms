"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol, TipoContenido } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { componerCodigo } from "@/lib/code-content";

/**
 * US45: el Tutor publica un fragmento de código (CODIGO).
 *
 * El lenguaje y el código se guardan juntos en `Contents.contenido` con el
 * formato de `lib/code-content.ts` — ver ahí por qué no hay una columna
 * nueva. El código NO se recorta con `trim()` en el cuerpo: la sangría del
 * principio es parte de lo que se quiere mostrar.
 */
const crearContenidoCodigoSchema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
  titulo: z.string().trim().min(2, "El título es obligatorio"),
  descripcion: z.string().trim().optional(),
  lenguaje: z.string().trim().max(30, "El nombre del lenguaje es demasiado largo").optional(),
  codigo: z.string().min(2, "El código es obligatorio"),
});

type ResultadoCrearContenidoCodigo =
  | { success: true; contenidoId: string }
  | { success: false; error: string };

export async function crearContenidoCodigo(
  _prevState: ResultadoCrearContenidoCodigo | null,
  formData: FormData
): Promise<ResultadoCrearContenidoCodigo> {
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

  const parsed = crearContenidoCodigoSchema.safeParse({
    courseId: formData.get("courseId"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || undefined,
    lenguaje: formData.get("lenguaje") || undefined,
    codigo: formData.get("codigo"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { courseId, titulo, descripcion, lenguaje, codigo } = parsed.data;

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
        tipo: TipoContenido.CODIGO,
        contenido: componerCodigo(lenguaje ?? "", codigo),
        orden: totalContenidos,
      },
    });

    revalidatePath(`/tutor/cursos/${courseId}`);
    revalidatePath(`/estudiante/cursos/${courseId}`);

    return { success: true, contenidoId: nuevoContenido.id };
  } catch (error) {
    console.error("Error creando contenido de código:", error);
    return { success: false, error: "No se pudo publicar el código. Intenta de nuevo." };
  }
}
