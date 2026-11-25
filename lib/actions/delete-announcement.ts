"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US53 — el Tutor borra un anuncio suyo (25/11/2026).
 *
 * Una sola confirmación, no la doble de eliminar una actividad (OP08): ahí
 * el segundo paso existe porque se pierden entregas y notas de estudiantes.
 * Un anuncio no se lleva nada de nadie — borrarlo por error cuesta volver a
 * escribirlo, y no vale la pena cobrarle dos clics a cada borrado por eso.
 *
 * Se pide el anuncio junto con su curso en una sola consulta (`include`),
 * misma lección de rendimiento que `moverSeccion` el 12/09/2026: dos
 * viajes a una base de datos remota solo para comprobar el dueño son uno
 * de más.
 */
const eliminarAnuncioSchema = z.object({
  anuncioId: z.string().min(1, "Anuncio inválido"),
});

type ResultadoEliminarAnuncio = { success: true } | { success: false; error: string };

export async function eliminarAnuncio(
  _prevState: ResultadoEliminarAnuncio | null,
  formData: FormData
): Promise<ResultadoEliminarAnuncio> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede borrar anuncios." };
  }

  const parsed = eliminarAnuncioSchema.safeParse({ anuncioId: formData.get("anuncioId") });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const anuncio = await prisma.anuncios.findUnique({
    where: { id: parsed.data.anuncioId },
    include: { course: true },
  });

  // Lo borra quien manda en el curso, no solo quien lo escribió: si un curso
  // cambió de manos, su tutor actual tiene que poder limpiar un aviso viejo.
  if (!anuncio || anuncio.course.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este anuncio no existe o no te pertenece." };
  }

  try {
    await prisma.anuncios.delete({ where: { id: anuncio.id } });

    revalidatePath(`/tutor/cursos/${anuncio.courseId}`);
    revalidatePath(`/estudiante/cursos/${anuncio.courseId}`);
    revalidatePath("/estudiante");

    return { success: true };
  } catch (error) {
    console.error("Error borrando el anuncio:", error);
    return { success: false, error: "No se pudo borrar el anuncio. Intenta de nuevo." };
  }
}
