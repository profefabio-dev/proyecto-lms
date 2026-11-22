"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  subirDocumentoAStorage,
  eliminarDocumentoDeStorage,
  MAX_TAMANO_DOCUMENTO_BYTES,
} from "@/lib/supabase/storage";

/**
 * El Estudiante presenta una actividad (19/11/2026). Puede responder
 * escribiendo, adjuntando un archivo, o ambas cosas — pero no con las dos
 * vacías.
 *
 * Reglas de esta primera versión:
 * - Solo puede entregar quien está inscrito en el curso de la actividad
 *   (misma verificación que ya protege el contenido desde US11).
 * - Una sola entrega por actividad: si vuelve a entregar, reemplaza la
 *   anterior (`upsert`). Al reemplazarla se borra el archivo viejo de
 *   Storage para no dejarlo huérfano, y se limpia la calificación previa,
 *   porque la nota correspondía al trabajo anterior.
 * - No se bloquea la entrega después de la fecha límite: se guarda la fecha
 *   y es el docente quien decide qué hacer con una entrega tardía. Bloquear
 *   dejaría al estudiante sin forma de presentar nada.
 */
const entregarSchema = z.object({
  actividadId: z.string().min(1, "Actividad inválida"),
  texto: z.string().trim().optional(),
  // 22/11/2026: hasta ahora un archivo adjunto solo se podía reemplazar por
  // otro, nunca quitar — quien adjuntaba algo por error quedaba con ese
  // archivo pegado a su entrega para siempre. Esta casilla permite volver a
  // una entrega de solo texto.
  quitarArchivo: z.boolean().optional(),
});

// Para las entregas se aceptan además imágenes (una foto del cuaderno es
// una forma normal de entregar en bachillerato), no solo PDF y Word como en
// los documentos del curso (US09).
const TIPOS_ENTREGA_PERMITIDOS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
];

type ResultadoEntrega = { success: true } | { success: false; error: string };

export async function entregarActividad(
  _prevState: ResultadoEntrega | null,
  formData: FormData
): Promise<ResultadoEntrega> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.ESTUDIANTE) {
    return { success: false, error: "Solo un estudiante puede entregar una actividad." };
  }

  const parsed = entregarSchema.safeParse({
    actividadId: formData.get("actividadId"),
    texto: formData.get("texto") || undefined,
    quitarArchivo: formData.get("quitarArchivo") === "on",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { actividadId, texto, quitarArchivo } = parsed.data;

  const actividad = await prisma.actividades.findUnique({ where: { id: actividadId } });

  if (!actividad || !actividad.visible) {
    return { success: false, error: "Esta actividad no está disponible." };
  }

  const inscripcion = await prisma.courseUsers.findFirst({
    where: { courseId: actividad.courseId, userId: usuarioActual.id },
  });

  if (!inscripcion) {
    return { success: false, error: "No estás inscrito en el curso de esta actividad." };
  }

  const adjunto = formData.get("archivo");
  // Se guarda ya estrechado a `File | null` (y no como un booleano aparte)
  // para que TypeScript lo siga tratando como archivo más abajo.
  const archivo = adjunto instanceof File && adjunto.size > 0 ? adjunto : null;

  const entregaPrevia = await prisma.entregas.findUnique({
    where: { actividadId_userId: { actividadId, userId: usuarioActual.id } },
  });

  // Adjuntar uno nuevo manda sobre la casilla de quitar: si el estudiante
  // eligió un archivo, está reemplazando, no borrando.
  const conservaElAnterior = !archivo && !quitarArchivo && Boolean(entregaPrevia?.archivo);
  const quedaraConArchivo = Boolean(archivo) || conservaElAnterior;

  // La validación mira cómo queda la entrega, no solo lo que llegó en este
  // envío: corregir el texto de una entrega que ya tenía archivo es válido,
  // y quedarse sin texto y sin archivo nunca lo es.
  if (!texto && !quedaraConArchivo) {
    return { success: false, error: "Escribe tu respuesta o adjunta un archivo." };
  }

  if (archivo) {
    if (!TIPOS_ENTREGA_PERMITIDOS.includes(archivo.type)) {
      return {
        success: false,
        error: "Solo se permiten archivos PDF, Word o imágenes (JPG, PNG, WEBP).",
      };
    }

    if (archivo.size > MAX_TAMANO_DOCUMENTO_BYTES) {
      return { success: false, error: "El archivo no puede superar los 10 MB." };
    }
  }

  // Mismo orden y patrón de compensación que en US09: primero Storage,
  // después la base de datos, y si la base de datos falla se borra el
  // archivo recién subido para no dejarlo huérfano.
  let pathNuevo: string | null = null;

  if (archivo) {
    try {
      const subida = await subirDocumentoAStorage(`entregas/${actividadId}`, archivo);
      pathNuevo = subida.path;
    } catch (error) {
      console.error("Error subiendo la entrega a Storage:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "No se pudo subir el archivo.",
      };
    }
  }

  try {
    const datos = {
      texto: texto || null,
      // Tres casos, en este orden: subió uno nuevo, pidió quitar el que
      // tenía, o no tocó el archivo — y entonces se conserva el anterior,
      // así puede corregir solo el texto sin volver a subirlo.
      archivo: pathNuevo ?? (conservaElAnterior ? (entregaPrevia?.archivo ?? null) : null),
      nombreArchivo: archivo
        ? archivo.name
        : conservaElAnterior
          ? (entregaPrevia?.nombreArchivo ?? null)
          : null,
      entregadaEn: new Date(),
      // La nota anterior ya no aplica al trabajo nuevo.
      nota: null,
      retroalimentacion: null,
      calificadaEn: null,
    };

    await prisma.entregas.upsert({
      where: { actividadId_userId: { actividadId, userId: usuarioActual.id } },
      create: { actividadId, userId: usuarioActual.id, ...datos },
      update: datos,
    });

    // El archivo viejo solo se borra una vez que el guardado salió bien, y
    // tanto si lo reemplazó como si pidió quitarlo: en los dos casos la
    // entrega ya no lo referencia, así que dejarlo en Storage sería basura.
    if (entregaPrevia?.archivo && !conservaElAnterior) {
      await eliminarDocumentoDeStorage(entregaPrevia.archivo);
    }

    revalidatePath(`/estudiante/cursos/${actividad.courseId}`);
    revalidatePath(`/tutor/cursos/${actividad.courseId}/actividades/${actividadId}`);

    return { success: true };
  } catch (error) {
    if (pathNuevo) {
      await eliminarDocumentoDeStorage(pathNuevo);
    }

    console.error("Error guardando la entrega:", error);
    return { success: false, error: "No se pudo guardar tu entrega. Intenta de nuevo." };
  }
}
