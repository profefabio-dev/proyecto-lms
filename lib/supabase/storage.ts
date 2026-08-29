import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "./admin";

/**
 * Utilidades de Supabase Storage para US09/US16 (documentos de un curso).
 *
 * El bucket es privado a propósito: los documentos solo deben ser
 * descargables por el Tutor dueño del curso y por los Estudiantes
 * inscritos, nunca por URL pública. Por eso siempre se generan URLs
 * firmadas de corta duración en vez de una URL pública fija.
 *
 * IMPORTANTE (setup manual, una sola vez): el bucket "documentos" debe
 * existir en el proyecto de Supabase (Storage → New bucket → nombre
 * "documentos" → Private). Este código no lo crea automáticamente.
 */

export const BUCKET_DOCUMENTOS = "documentos";

export const TIPOS_DOCUMENTO_PERMITIDOS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const MAX_TAMANO_DOCUMENTO_BYTES = 10 * 1024 * 1024; // 10 MB

export function esTipoDocumentoPermitido(mimeType: string): boolean {
  return (TIPOS_DOCUMENTO_PERMITIDOS as readonly string[]).includes(mimeType);
}

/**
 * US16: los documentos PDF se pueden previsualizar embebidos en el
 * navegador (los navegadores modernos renderizan PDF de forma nativa);
 * los documentos Word (.doc/.docx) no tienen esa capacidad nativa, así
 * que para esos solo se ofrece el enlace de descarga.
 */
export function esDocumentoPdf(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

function sanearNombreArchivo(nombre: string): string {
  return nombre.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function subirDocumentoAStorage(
  courseId: string,
  archivo: File
): Promise<{ path: string }> {
  const path = `${courseId}/${randomUUID()}-${sanearNombreArchivo(archivo.name)}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(path, archivo, { contentType: archivo.type, upsert: false });

  if (error) {
    throw new Error(`No se pudo subir el archivo: ${error.message}`);
  }

  return { path };
}

export async function eliminarDocumentoDeStorage(path: string): Promise<void> {
  await supabaseAdmin.storage.from(BUCKET_DOCUMENTOS).remove([path]);
}

export async function crearUrlDescarga(
  path: string,
  expiraEnSegundos = 60
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(path, expiraEnSegundos);

  if (error || !data) {
    return null;
  }

  return data.signedUrl;
}
