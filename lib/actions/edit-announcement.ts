"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US53 — corregir un anuncio ya publicado (26/11/2026).
 *
 * Hasta hoy la única forma de arreglar una errata era **borrarlo y
 * escribirlo de nuevo**, que además lo movía al principio de la lista y lo
 * volvía a mostrar como novedad: el estudiante lo veía dos veces y el
 * segundo aviso parecía nuevo sin serlo. Mismo criterio que OP06 para los
 * contenidos, que no se podían editar y había que recrear.
 *
 * **No se toca `createdAt`.** Corregir una palabra no vuelve nuevo el
 * anuncio, y la fecha es lo que ordena las novedades y lo que el estudiante
 * usa para saber de cuándo es.
 *
 * **Tampoco se cambia el `tutorId`.** Es de quien lo escribió (US53), no de
 * quien lo corrige: un curso adoptado (US47) puede cambiar de manos, y el
 * tutor actual puede corregir una errata sin quedarse con la autoría.
 *
 * Mismas reglas que al crearlo: el cuerpo va en Markdown y se renderiza con
 * `MarkdownContent`, nunca como HTML crudo.
 */
const editarAnuncioSchema = z.object({
  anuncioId: z.string().min(1, "Anuncio inválido"),
  titulo: z.string().trim().min(3, "El título debe tener al menos 3 caracteres"),
  cuerpo: z.string().trim().min(10, "Escribe el anuncio para tus estudiantes"),
});

export type ResultadoEditarAnuncio = { success: true } | { success: false; error: string };

export async function editarAnuncio(
  _prevState: ResultadoEditarAnuncio | null,
  formData: FormData
): Promise<ResultadoEditarAnuncio> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede editar anuncios." };
  }

  const parsed = editarAnuncioSchema.safeParse({
    anuncioId: formData.get("anuncioId"),
    titulo: formData.get("titulo"),
    cuerpo: formData.get("cuerpo"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const anuncio = await prisma.anuncios.findUnique({
    where: { id: parsed.data.anuncioId },
    include: { course: true },
  });

  // Lo edita quien manda en el curso, igual que al borrarlo: si un curso
  // cambió de manos, su tutor actual tiene que poder corregir un aviso.
  if (!anuncio || anuncio.course.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este anuncio no existe o no te pertenece." };
  }

  try {
    await prisma.anuncios.update({
      where: { id: anuncio.id },
      data: { titulo: parsed.data.titulo, cuerpo: parsed.data.cuerpo },
    });

    revalidatePath(`/tutor/cursos/${anuncio.courseId}`);
    revalidatePath(`/estudiante/cursos/${anuncio.courseId}`);
    revalidatePath("/estudiante");

    return { success: true };
  } catch (error) {
    console.error("Error editando el anuncio:", error);
    return { success: false, error: "No se pudo guardar el anuncio. Intenta de nuevo." };
  }
}
