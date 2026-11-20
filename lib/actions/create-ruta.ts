"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US44: el Tutor crea una ruta de aprendizaje.
 *
 * Nace en BORRADOR y vacía: primero se arma el camino agregándole cursos
 * (`agregarCursoARuta`) y solo cuando tiene sentido recorrerla se publica
 * (`cambiarEstadoRuta`). Es el mismo criterio de `Courses`: nada aparece en
 * la pantalla del estudiante antes de que el docente lo decida.
 */
const crearRutaSchema = z.object({
  titulo: z.string().trim().min(3, "El título debe tener al menos 3 caracteres"),
  descripcion: z.string().trim().min(10, "La descripción debe tener al menos 10 caracteres"),
});

type ResultadoCrearRuta = { success: true; rutaId: string } | { success: false; error: string };

export async function crearRuta(
  _prevState: ResultadoCrearRuta | null,
  formData: FormData
): Promise<ResultadoCrearRuta> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede crear rutas de aprendizaje." };
  }

  const parsed = crearRutaSchema.safeParse({
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    const ruta = await prisma.rutas.create({
      data: {
        titulo: parsed.data.titulo,
        descripcion: parsed.data.descripcion,
        tutorId: usuarioActual.id,
      },
    });

    revalidatePath("/tutor/rutas");

    return { success: true, rutaId: ruta.id };
  } catch (error) {
    console.error("Error creando ruta:", error);
    return { success: false, error: "No se pudo crear la ruta. Intenta de nuevo." };
  }
}
