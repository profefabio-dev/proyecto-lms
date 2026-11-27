"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US54 — el Tutor borra un término del glosario (27/11/2026).
 *
 * **Una sola confirmación**, igual que al borrar un anuncio (US53) y a
 * diferencia de eliminar una actividad (OP08): ahí el segundo paso existe
 * porque se pierden entregas y notas de estudiantes. Un término del glosario
 * no se lleva nada de nadie — volver a escribirlo cuesta diez segundos.
 *
 * **Por eso mismo esta historia no trae una acción de editar:** corregir la
 * definición de una palabra es borrarla y escribirla de nuevo, y acá eso no
 * pierde nada ni "vuelve nuevo" el término, que es justo lo que sí pasaba
 * con un anuncio (reaparecía como novedad en el panel del estudiante) y por
 * lo que ese sí necesitó edición propia.
 *
 * El término se pide junto con su curso en una sola consulta, misma lección
 * de rendimiento que `eliminarAnuncio`.
 */
const eliminarTerminoSchema = z.object({
  terminoId: z.string().min(1, "Término inválido"),
});

export type ResultadoEliminarTermino = { success: true } | { success: false; error: string };

export async function eliminarTermino(
  _prevState: ResultadoEliminarTermino | null,
  formData: FormData
): Promise<ResultadoEliminarTermino> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede borrar términos del glosario." };
  }

  const parsed = eliminarTerminoSchema.safeParse({ terminoId: formData.get("terminoId") });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const termino = await prisma.glosario.findUnique({
    where: { id: parsed.data.terminoId },
    include: { course: { select: { tutorId: true } } },
  });

  // El curso tiene que ser del tutor autenticado: sin esto, conocer el id
  // bastaría para vaciarle el glosario a otro docente.
  if (!termino || termino.course.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este término no existe o no te pertenece." };
  }

  try {
    await prisma.glosario.delete({ where: { id: termino.id } });

    revalidatePath(`/tutor/cursos/${termino.courseId}`);
    revalidatePath(`/estudiante/cursos/${termino.courseId}`);
    revalidatePath(`/estudiante/cursos/${termino.courseId}/glosario`);

    return { success: true };
  } catch (error) {
    console.error("Error borrando el término del glosario:", error);
    return { success: false, error: "No se pudo borrar el término. Intenta de nuevo." };
  }
}
