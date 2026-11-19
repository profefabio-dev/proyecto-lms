"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * El Tutor crea una actividad evaluable dentro de un curso suyo
 * (19/11/2026). Nace visible y al final de la lista, con el mismo criterio
 * de `orden` incremental que ya usan `crearSeccion` y los contenidos.
 *
 * `fechaLimite` es opcional a propósito: no todas las actividades tienen
 * plazo, y una fecha vacía no debe bloquear la creación. Cuando viene, se
 * interpreta en la zona horaria del servidor a partir de un campo
 * `datetime-local` del formulario.
 */
const crearActividadSchema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
  seccionId: z.string().optional(),
  titulo: z.string().trim().min(3, "El título debe tener al menos 3 caracteres"),
  descripcion: z.string().trim().optional(),
  instrucciones: z.string().trim().min(10, "Escribe las instrucciones de la actividad"),
  puntajeMaximo: z.coerce
    .number()
    .int("El puntaje máximo debe ser un número entero")
    .min(1, "El puntaje máximo debe ser al menos 1")
    .max(1000, "El puntaje máximo no puede pasar de 1000"),
  fechaLimite: z.string().optional(),
});

type ResultadoCrearActividad =
  | { success: true; actividadId: string }
  | { success: false; error: string };

export async function crearActividad(
  _prevState: ResultadoCrearActividad | null,
  formData: FormData
): Promise<ResultadoCrearActividad> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede crear actividades." };
  }

  const parsed = crearActividadSchema.safeParse({
    courseId: formData.get("courseId"),
    seccionId: formData.get("seccionId") || undefined,
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") || undefined,
    instrucciones: formData.get("instrucciones"),
    puntajeMaximo: formData.get("puntajeMaximo") || 100,
    fechaLimite: formData.get("fechaLimite") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { courseId, seccionId, titulo, descripcion, instrucciones, puntajeMaximo, fechaLimite } =
    parsed.data;

  const curso = await prisma.courses.findUnique({ where: { id: courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no existe o no te pertenece." };
  }

  // Una sección ajena al curso no debe poder colarse por el formulario.
  if (seccionId) {
    const seccion = await prisma.secciones.findUnique({ where: { id: seccionId } });

    if (!seccion || seccion.courseId !== courseId) {
      return { success: false, error: "La sección elegida no pertenece a este curso." };
    }
  }

  let fecha: Date | null = null;

  if (fechaLimite) {
    const convertida = new Date(fechaLimite);

    if (Number.isNaN(convertida.getTime())) {
      return { success: false, error: "La fecha límite no es válida." };
    }

    fecha = convertida;
  }

  try {
    const totalActividades = await prisma.actividades.count({ where: { courseId } });

    const actividad = await prisma.actividades.create({
      data: {
        courseId,
        seccionId: seccionId ?? null,
        titulo,
        descripcion: descripcion || null,
        instrucciones,
        puntajeMaximo,
        fechaLimite: fecha,
        orden: totalActividades,
      },
    });

    revalidatePath(`/tutor/cursos/${courseId}`);
    revalidatePath(`/estudiante/cursos/${courseId}`);

    return { success: true, actividadId: actividad.id };
  } catch (error) {
    console.error("Error creando actividad:", error);
    return { success: false, error: "No se pudo crear la actividad. Intenta de nuevo." };
  }
}
