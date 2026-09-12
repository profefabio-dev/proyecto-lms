"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US30: el Tutor crea una sección para agrupar el contenido de un curso.
 * Nace siempre "Disponible" y al final de la lista (mismo criterio de
 * `orden` incremental que ya usa `crearContenidoTexto`/`crearContenidoVideo`
 * para el contenido) — el Tutor puede reordenarla después con
 * `moverSeccion`.
 */
const crearSeccionSchema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
  titulo: z.string().min(3, "El título debe tener al menos 3 caracteres"),
});

type ResultadoCrearSeccion =
  | { success: true; seccionId: string }
  | { success: false; error: string };

export async function crearSeccion(
  _prevState: ResultadoCrearSeccion | null,
  formData: FormData
): Promise<ResultadoCrearSeccion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede crear secciones." };
  }

  const parsed = crearSeccionSchema.safeParse({
    courseId: formData.get("courseId"),
    titulo: formData.get("titulo"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { courseId, titulo } = parsed.data;

  const curso = await prisma.courses.findUnique({ where: { id: courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no te pertenece." };
  }

  try {
    const totalSecciones = await prisma.secciones.count({ where: { courseId } });

    const seccion = await prisma.secciones.create({
      data: { courseId, titulo, orden: totalSecciones },
    });

    revalidatePath(`/tutor/cursos/${courseId}`);
    revalidatePath(`/estudiante/cursos/${courseId}`);

    return { success: true, seccionId: seccion.id };
  } catch (error) {
    console.error("Error creando sección:", error);
    return { success: false, error: "No se pudo crear la sección. Intenta de nuevo." };
  }
}
