"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  esTipoImagenPermitido,
  subirImagenCursoAStorage,
  eliminarImagenCursoDeStorage,
  MAX_TAMANO_IMAGEN_BYTES,
} from "@/lib/supabase/storage";

const crearCursoSchema = z.object({
  titulo: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  descripcion: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
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
    estado: formData.get("estado") ?? "BORRADOR",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  // Corrección sobre US07: el docente pidió poder subir la imagen desde su
  // computador, así que ahora se acepta un archivo o una URL pegada (mismo
  // orden storage-primero-luego-base-de-datos que US09 para documentos).
  // Se acepta exactamente una de las dos opciones.
  const archivoImagen = formData.get("imagenArchivo");
  const urlImagen = formData.get("imagenUrl");

  let imagen: string;
  let pathImagenSubida: string | null = null;

  if (archivoImagen instanceof File && archivoImagen.size > 0) {
    if (!esTipoImagenPermitido(archivoImagen.type)) {
      return { success: false, error: "Solo se permiten imágenes JPG, PNG o WEBP." };
    }

    if (archivoImagen.size > MAX_TAMANO_IMAGEN_BYTES) {
      return { success: false, error: "La imagen no puede superar los 5 MB." };
    }

    try {
      const subida = await subirImagenCursoAStorage(archivoImagen);
      imagen = subida.url;
      pathImagenSubida = subida.path;
    } catch (error) {
      console.error("Error subiendo imagen del curso a Storage:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "No se pudo subir la imagen.",
      };
    }
  } else if (typeof urlImagen === "string" && urlImagen.trim() !== "") {
    const urlValidada = z.string().url("Debes ingresar una URL de imagen válida").safeParse(urlImagen);

    if (!urlValidada.success) {
      return { success: false, error: urlValidada.error.issues[0]?.message ?? "URL inválida." };
    }

    imagen = urlValidada.data;
  } else {
    return {
      success: false,
      error: "Debes subir una imagen desde tu computador o ingresar una URL de imagen.",
    };
  }

  try {
    const curso = await prisma.courses.create({
      data: {
        titulo: parsed.data.titulo,
        descripcion: parsed.data.descripcion,
        imagen,
        estado: parsed.data.estado,
        tutorId: usuarioActual.id,
      },
    });

    revalidatePath("/tutor/cursos");

    return { success: true, cursoId: curso.id };
  } catch (error) {
    // Compensación: si falla el guardado en la base de datos y la imagen
    // ya se había subido a Storage, se borra para no dejarla huérfana.
    if (pathImagenSubida) {
      await eliminarImagenCursoDeStorage(pathImagenSubida);
    }
    console.error("Error creando curso:", error);
    return { success: false, error: "No se pudo crear el curso. Intenta de nuevo." };
  }
}