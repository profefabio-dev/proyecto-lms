"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { eliminarDocumentoDeStorage } from "@/lib/supabase/storage";

/**
 * OP08 (21/11/2026): el Tutor elimina una actividad.
 *
 * El docente probó la épica de evaluación y reportó que "no hay opción para
 * quitar o eliminar actividades creadas" — se podían crear pero no deshacer,
 * así que una actividad mal creada se quedaba ahí para siempre a la vista de
 * los estudiantes.
 *
 * A diferencia de `eliminarSeccion` (US30), que conserva el contenido y solo
 * deshace la agrupación, **aquí sí se pierde trabajo**: las entregas de los
 * estudiantes y sus notas cuelgan de la actividad y no tienen dónde quedar.
 * Por eso esta acción devuelve, y la interfaz muestra antes de confirmar,
 * cuántas entregas se van a borrar — y la confirmación es doble
 * (`DeleteActivityForm`, mismo patrón que quitar estudiantes de un curso).
 *
 * Orden de las operaciones: primero la base de datos en una transacción
 * (entregas y después la actividad, por la clave foránea) y solo al final
 * los archivos de Storage. Es el inverso del patrón de subida (US09) y por
 * la misma razón: si falla la base de datos, no se ha borrado ningún
 * archivo; si falla el borrado de un archivo ya sin referencia, queda un
 * huérfano en Storage, que es un desperdicio pero no un dato inconsistente.
 */
const eliminarActividadSchema = z.object({
  actividadId: z.string().min(1, "Actividad inválida"),
});

type ResultadoEliminarActividad =
  | { success: true; entregasBorradas: number }
  | { success: false; error: string };

export async function eliminarActividad(
  _prevState: ResultadoEliminarActividad | null,
  formData: FormData
): Promise<ResultadoEliminarActividad> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede eliminar actividades." };
  }

  const parsed = eliminarActividadSchema.safeParse({
    actividadId: formData.get("actividadId"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const actividad = await prisma.actividades.findUnique({
    where: { id: parsed.data.actividadId },
    include: { course: true, entregas: { select: { archivo: true } } },
  });

  if (!actividad) {
    return { success: false, error: "Esta actividad no existe." };
  }

  if (actividad.course.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no te pertenece." };
  }

  const archivos = actividad.entregas
    .map((entrega) => entrega.archivo)
    .filter((archivo): archivo is string => Boolean(archivo));

  try {
    await prisma.$transaction([
      prisma.entregas.deleteMany({ where: { actividadId: actividad.id } }),
      prisma.actividades.delete({ where: { id: actividad.id } }),
    ]);
  } catch (error) {
    console.error("Error eliminando la actividad:", error);
    return { success: false, error: "No se pudo eliminar la actividad. Intenta de nuevo." };
  }

  // Ya nada en la base de datos apunta a estos archivos: si alguno falla al
  // borrarse, queda huérfano en Storage pero no rompe nada, así que no
  // deshace el borrado que ya se completó.
  for (const archivo of archivos) {
    await eliminarDocumentoDeStorage(archivo).catch((error) => {
      console.error("No se pudo borrar un archivo de entrega de Storage:", error);
    });
  }

  revalidatePath(`/tutor/cursos/${actividad.courseId}`);
  revalidatePath(`/tutor/cursos/${actividad.courseId}/seguimiento`);
  revalidatePath(`/estudiante/cursos/${actividad.courseId}`);
  revalidatePath("/estudiante/notas");

  return { success: true, entregasBorradas: actividad.entregas.length };
}
