"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol, TipoContenido } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  esTipoDocumentoPermitido,
  subirDocumentoAStorage,
  eliminarDocumentoDeStorage,
  MAX_TAMANO_DOCUMENTO_BYTES,
} from "@/lib/supabase/storage";

const datosSchema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
  titulo: z.string().trim().min(2, "El título es obligatorio"),
  descripcion: z.string().trim().optional(),
});

type ResultadoSubirDocumento =
  | { success: true; contenidoId: string }
  | { success: false; error: string };

export async function subirDocumento(
  _prevState: ResultadoSubirDocumento | null,
  formData: FormData
): Promise<ResultadoSubirDocumento> {
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

  // 2. Validar los campos de texto del formulario.
  const parsed = datosSchema.safeParse({
    courseId: formData.get("courseId"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { courseId, titulo, descripcion } = parsed.data;

  // 3. Validar el archivo adjunto.
  const archivo = formData.get("archivo");

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { success: false, error: "Debes adjuntar un archivo." };
  }

  if (!esTipoDocumentoPermitido(archivo.type)) {
    return {
      success: false,
      error: "Solo se permiten archivos PDF o Word (.doc, .docx).",
    };
  }

  if (archivo.size > MAX_TAMANO_DOCUMENTO_BYTES) {
    return { success: false, error: "El archivo no puede superar los 10 MB." };
  }

  // 4. El curso debe existir y pertenecer al tutor autenticado.
  const curso = await prisma.courses.findUnique({ where: { id: courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no existe o no te pertenece." };
  }

  // 5. Subir el archivo a Supabase Storage antes de tocar la base de
  // datos (mismo orden que US21/US22: primero la fuente externa).
  let path: string;

  try {
    const subida = await subirDocumentoAStorage(courseId, archivo);
    path = subida.path;
  } catch (error) {
    console.error("Error subiendo documento a Storage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo subir el archivo.",
    };
  }

  try {
    const totalContenidos = await prisma.contents.count({ where: { courseId } });

    const nuevoContenido = await prisma.contents.create({
      data: {
        courseId,
        titulo,
        descripcion: descripcion || null,
        tipo: TipoContenido.DOCUMENTO,
        contenido: path,
        orden: totalContenidos,
        documentos: {
          create: {
            archivo: path,
            nombre: archivo.name,
            tipo: archivo.type,
          },
        },
      },
    });

    revalidatePath(`/tutor/cursos/${courseId}`);
    revalidatePath(`/estudiante/cursos/${courseId}`);

    return { success: true, contenidoId: nuevoContenido.id };
  } catch (error) {
    // 6. Compensación: si falla el guardado en la base de datos, borramos
    // el archivo que ya se había subido, para no dejar un archivo huérfano
    // en Storage sin ningún registro que lo referencie.
    await eliminarDocumentoDeStorage(path);
    console.error("Error creando contenido de documento:", error);
    return { success: false, error: "No se pudo publicar el documento. Intenta de nuevo." };
  }
}
