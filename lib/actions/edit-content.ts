"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol, TipoContenido } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { esUrlDeYoutubeValida } from "@/lib/youtube";
import {
  esTipoDocumentoPermitido,
  subirDocumentoAStorage,
  eliminarDocumentoDeStorage,
  MAX_TAMANO_DOCUMENTO_BYTES,
} from "@/lib/supabase/storage";

/**
 * OP06: el docente reportó que no había forma de corregir un contenido ya
 * publicado (título, descripción, ni el video/texto/documento en sí) — solo
 * se podía crear, reordenar, ocultar o mover de sección.
 *
 * El tipo de un contenido (VIDEO/TEXTO/DOCUMENTO) nunca cambia al editar: se
 * toma del contenido existente en la base de datos, nunca de lo que mande el
 * formulario, así que no hay forma de "convertir" un video en documento
 * enviando el campo equivocado. Según ese tipo se exige un campo de cuerpo
 * distinto: `url` (video), `contenido` (texto) o `archivo` (documento,
 * opcional — si no se adjunta uno nuevo, se conserva el actual).
 *
 * Misma lección de rendimiento que `moverSeccion` (12/09/2026): el contenido
 * y su curso se piden en una sola consulta con `include`, no dos por
 * separado.
 */
const datosBaseSchema = z.object({
  contentId: z.string().min(1, "Contenido inválido"),
  titulo: z.string().trim().min(2, "El título es obligatorio"),
  descripcion: z.string().trim().optional(),
});

type ResultadoEditarContenido = { success: true } | { success: false; error: string };

export async function editarContenido(
  _prevState: ResultadoEditarContenido | null,
  formData: FormData
): Promise<ResultadoEditarContenido> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede editar contenido." };
  }

  const parsedBase = datosBaseSchema.safeParse({
    contentId: formData.get("contentId"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || undefined,
  });

  if (!parsedBase.success) {
    return { success: false, error: parsedBase.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { contentId, titulo, descripcion } = parsedBase.data;

  const contenido = await prisma.contents.findUnique({
    where: { id: contentId },
    include: { course: true, documentos: true },
  });

  if (!contenido) {
    return { success: false, error: "Este contenido no existe." };
  }

  if (contenido.course.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no te pertenece." };
  }

  if (contenido.tipo === TipoContenido.VIDEO) {
    const parsedUrl = z
      .string()
      .trim()
      .url("La URL no es válida")
      .refine(esUrlDeYoutubeValida, {
        message: "Debe ser un enlace de YouTube válido (youtube.com o youtu.be)",
      })
      .safeParse(formData.get("url"));

    if (!parsedUrl.success) {
      return { success: false, error: parsedUrl.error.issues[0]?.message ?? "URL inválida." };
    }

    try {
      await prisma.contents.update({
        where: { id: contentId },
        data: { titulo, descripcion: descripcion || null, contenido: parsedUrl.data },
      });

      revalidatePath(`/tutor/cursos/${contenido.courseId}`);
      revalidatePath(`/estudiante/cursos/${contenido.courseId}`);

      return { success: true };
    } catch (error) {
      console.error("Error editando contenido de video:", error);
      return { success: false, error: "No se pudo guardar el video. Intenta de nuevo." };
    }
  }

  if (contenido.tipo === TipoContenido.TEXTO) {
    const parsedTexto = z
      .string()
      .trim()
      .min(2, "El contenido es obligatorio")
      .safeParse(formData.get("contenido"));

    if (!parsedTexto.success) {
      return { success: false, error: parsedTexto.error.issues[0]?.message ?? "Datos inválidos." };
    }

    try {
      await prisma.contents.update({
        where: { id: contentId },
        data: { titulo, descripcion: descripcion || null, contenido: parsedTexto.data },
      });

      revalidatePath(`/tutor/cursos/${contenido.courseId}`);
      revalidatePath(`/estudiante/cursos/${contenido.courseId}`);

      return { success: true };
    } catch (error) {
      console.error("Error editando contenido de texto:", error);
      return { success: false, error: "No se pudo guardar el contenido. Intenta de nuevo." };
    }
  }

  // TipoContenido.DOCUMENTO: el archivo nuevo es opcional — si no llega
  // ninguno, se guardan solo título y descripción, sin tocar Storage.
  const archivo = formData.get("archivo");
  const hayArchivoNuevo = archivo instanceof File && archivo.size > 0;

  if (!hayArchivoNuevo) {
    try {
      await prisma.contents.update({
        where: { id: contentId },
        data: { titulo, descripcion: descripcion || null },
      });

      revalidatePath(`/tutor/cursos/${contenido.courseId}`);
      revalidatePath(`/estudiante/cursos/${contenido.courseId}`);

      return { success: true };
    } catch (error) {
      console.error("Error editando contenido de documento:", error);
      return { success: false, error: "No se pudo guardar. Intenta de nuevo." };
    }
  }

  if (!esTipoDocumentoPermitido(archivo.type)) {
    return { success: false, error: "Solo se permiten archivos PDF o Word (.doc, .docx)." };
  }

  if (archivo.size > MAX_TAMANO_DOCUMENTO_BYTES) {
    return { success: false, error: "El archivo no puede superar los 10 MB." };
  }

  const documentoActual = contenido.documentos[0];
  let nuevoPath: string;

  try {
    const subida = await subirDocumentoAStorage(contenido.courseId, archivo);
    nuevoPath = subida.path;
  } catch (error) {
    console.error("Error subiendo el nuevo documento a Storage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo subir el archivo.",
    };
  }

  try {
    await prisma.$transaction([
      prisma.contents.update({
        where: { id: contentId },
        data: { titulo, descripcion: descripcion || null, contenido: nuevoPath },
      }),
      ...(documentoActual
        ? [
            prisma.documents.update({
              where: { id: documentoActual.id },
              data: { archivo: nuevoPath, nombre: archivo.name, tipo: archivo.type },
            }),
          ]
        : [
            prisma.documents.create({
              data: { contentId, archivo: nuevoPath, nombre: archivo.name, tipo: archivo.type },
            }),
          ]),
    ]);
  } catch (error) {
    // La base de datos no llegó a apuntar al archivo nuevo — se borra ese
    // archivo recién subido (rollback) y se deja el anterior intacto.
    await eliminarDocumentoDeStorage(nuevoPath);
    console.error("Error editando contenido de documento:", error);
    return { success: false, error: "No se pudo guardar el documento. Intenta de nuevo." };
  }

  // La base de datos ya apunta al archivo nuevo; recién ahora se borra el
  // anterior — si esto falla, queda un archivo huérfano en Storage sin
  // ninguna referencia (no un dato inconsistente), así que no debe deshacer
  // el guardado que ya se completó correctamente.
  if (documentoActual) {
    await eliminarDocumentoDeStorage(documentoActual.archivo).catch((error) => {
      console.error("No se pudo borrar el documento anterior de Storage:", error);
    });
  }

  revalidatePath(`/tutor/cursos/${contenido.courseId}`);
  revalidatePath(`/estudiante/cursos/${contenido.courseId}`);

  return { success: true };
}
