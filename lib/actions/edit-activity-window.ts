"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { cierreCoherente } from "@/lib/activity-submission";

/**
 * Cambiar las dos fechas de una actividad **ya creada** (26/11/2026).
 *
 * US52 agregó la fecha de cierre, pero las dos fechas solo se podían
 * definir **al crear** la actividad — exactamente el problema que OP05
 * corrigió para el estado de un curso, donde publicar obligaba a volver a
 * escribir título, descripción e imagen como si fuera un curso nuevo. Un
 * plazo es lo que más se mueve en un curso real ("no alcanzaron, lo corro
 * al lunes"), así que es lo primero que hacía falta poder editar.
 *
 * **Acción enfocada, igual que `cambiarEstadoCurso` (OP05):** solo escribe
 * `fechaLimite` y `fechaCierre`; nunca pide ni toca el título, las
 * instrucciones, el puntaje ni el tipo de entrega.
 *
 * **Un campo vacío borra la fecha, no la deja igual.** El formulario manda
 * siempre los dos campos, así que vacío significa "sin plazo" — que es la
 * única forma de volver atrás después de haber puesto una fecha por error.
 * Por eso el esquema acepta cadena vacía en vez de tratarla como ausente.
 */
const editarVentanaSchema = z.object({
  actividadId: z.string().min(1, "Actividad inválida"),
  fechaLimite: z.string(),
  fechaCierre: z.string(),
});

export type ResultadoEditarVentana = { success: true } | { success: false; error: string };

/** Convierte lo que manda un `datetime-local`; vacío es `null`. */
function aFecha(valor: string): Date | null | "invalida" {
  if (valor.trim().length === 0) {
    return null;
  }

  const convertida = new Date(valor);

  return Number.isNaN(convertida.getTime()) ? "invalida" : convertida;
}

export async function editarVentanaDeActividad(
  _prevState: ResultadoEditarVentana | null,
  formData: FormData
): Promise<ResultadoEditarVentana> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede cambiar las fechas de una actividad." };
  }

  const parsed = editarVentanaSchema.safeParse({
    actividadId: formData.get("actividadId"),
    fechaLimite: formData.get("fechaLimite") ?? "",
    fechaCierre: formData.get("fechaCierre") ?? "",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { actividadId } = parsed.data;

  const actividad = await prisma.actividades.findUnique({
    where: { id: actividadId },
    include: { course: { select: { tutorId: true } } },
  });

  // La actividad debe ser de un curso del tutor autenticado: sin esto,
  // conocer el id bastaría para mover el plazo del curso de otro docente.
  if (!actividad || actividad.course.tutorId !== usuarioActual.id) {
    return { success: false, error: "Esta actividad no existe o no te pertenece." };
  }

  const fechaLimite = aFecha(parsed.data.fechaLimite);

  if (fechaLimite === "invalida") {
    return { success: false, error: "La fecha límite no es válida." };
  }

  const fechaCierre = aFecha(parsed.data.fechaCierre);

  if (fechaCierre === "invalida") {
    return { success: false, error: "La fecha de cierre no es válida." };
  }

  // La misma comprobación que al crearla: un cierre anterior al vencimiento
  // dejaría una actividad en la que entregar a tiempo ya es imposible.
  if (!cierreCoherente({ fechaLimite, fechaCierre })) {
    return {
      success: false,
      error: "La fecha de cierre no puede ser anterior a la fecha límite.",
    };
  }

  try {
    await prisma.actividades.update({
      where: { id: actividadId },
      data: { fechaLimite, fechaCierre },
    });

    revalidatePath(`/tutor/cursos/${actividad.courseId}`);
    revalidatePath(`/tutor/cursos/${actividad.courseId}/actividades/${actividadId}`);
    // El estudiante ve el plazo en la portada del curso y en la actividad.
    revalidatePath(`/estudiante/cursos/${actividad.courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error cambiando las fechas de la actividad:", error);
    return { success: false, error: "No se pudieron guardar las fechas. Intenta de nuevo." };
  }
}
