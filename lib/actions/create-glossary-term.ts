"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { terminoRepetido } from "@/lib/glosario";

/**
 * US54 — el Tutor agrega un término al glosario de un curso suyo
 * (27/11/2026).
 *
 * **El término se guarda tal como lo escribió el docente**, con sus acentos y
 * mayúsculas: es lo que va a leer el estudiante. Lo que se normaliza es solo
 * la comparación para no guardar dos veces la misma palabra escrita distinto
 * (ver `lib/glosario.ts`).
 *
 * **La comprobación de repetido se hace en el servidor y además la tabla
 * tiene índice único** por curso y término. Lo primero da el mensaje útil
 * ("ya tienes un término así"); lo segundo es lo que de verdad lo impide si
 * dos envíos llegan a la vez — el índice único no sabe de acentos, pero la
 * carrera que puede ganar es la del texto idéntico, que es la probable.
 */
const crearTerminoSchema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
  termino: z
    .string()
    .trim()
    .min(2, "El término debe tener al menos 2 caracteres")
    .max(60, "El término es demasiado largo para un glosario"),
  definicion: z
    .string()
    .trim()
    .min(10, "Escribe la definición del término")
    .max(1000, "La definición es demasiado larga"),
});

export type ResultadoCrearTermino =
  | { success: true; terminoId: string }
  | { success: false; error: string };

export async function crearTermino(
  _prevState: ResultadoCrearTermino | null,
  formData: FormData
): Promise<ResultadoCrearTermino> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede escribir el glosario de un curso." };
  }

  const parsed = crearTerminoSchema.safeParse({
    courseId: formData.get("courseId"),
    termino: formData.get("termino"),
    definicion: formData.get("definicion"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { courseId, termino, definicion } = parsed.data;

  const curso = await prisma.courses.findUnique({
    where: { id: courseId },
    select: { tutorId: true, glosario: { select: { termino: true } } },
  });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no existe o no te pertenece." };
  }

  if (
    terminoRepetido(
      termino,
      curso.glosario.map((t: { termino: string }) => t.termino)
    )
  ) {
    return {
      success: false,
      error: `Ya tienes un término así en este glosario. Si quieres cambiar su definición, bórralo y escríbelo de nuevo.`,
    };
  }

  try {
    const creado = await prisma.glosario.create({
      data: { courseId, termino, definicion },
    });

    revalidatePath(`/tutor/cursos/${courseId}`);
    revalidatePath(`/estudiante/cursos/${courseId}`);
    revalidatePath(`/estudiante/cursos/${courseId}/glosario`);

    return { success: true, terminoId: creado.id };
  } catch (error) {
    console.error("Error creando el término del glosario:", error);
    return { success: false, error: "No se pudo guardar el término. Intenta de nuevo." };
  }
}
