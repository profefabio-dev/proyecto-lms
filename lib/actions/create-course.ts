"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const crearCursoSchema = z.object({
  titulo: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  descripcion: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  imagen: z.string().url("Debes ingresar una URL de imagen válida"),
  estado: z.enum(["BORRADOR", "PUBLICADO"]),
});

type ResultadoCrearCurso =
  | { success: true; cursoId: string }
  | { success: false; error: string };

export async function crearCurso(
  _prevState: ResultadoCrearCurso | null,
  formData: FormData
): Promise<ResultadoCrearCurso> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede crear cursos." };
  }

  const parsed = crearCursoSchema.safeParse({
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion"),
    imagen: formData.get("imagen"),
    estado: formData.get("estado") ?? "BORRADOR",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    const curso = await prisma.courses.create({
      data: {
        titulo: parsed.data.titulo,
        descripcion: parsed.data.descripcion,
        imagen: parsed.data.imagen,
        estado: parsed.data.estado,
        tutorId: usuarioActual.id,
      },
    });

    revalidatePath("/tutor/cursos");

    return { success: true, cursoId: curso.id };
  } catch (error) {
    console.error("Error creando curso:", error);
    return { success: false, error: "No se pudo crear el curso. Intenta de nuevo." };
  }
}