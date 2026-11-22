"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US47 — el Tutor decide si su curso puede ser tomado por otros docentes
 * (23/11/2026).
 *
 * Compartir es decisión de quien crea, no del Super Administrador: cada
 * Tutor manda sobre su trabajo, coherente con el aislamiento por espacios
 * de US24, y nadie queda esperando una aprobación para que lo suyo sirva.
 * Lo que sí se reserva el Super Administrador es el sello de verificado y
 * poder retirar algo del catálogo (US49).
 *
 * Un curso nace con `compartible: false`: nada circula sin que su autor lo
 * diga.
 */
const esquema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
});

type Resultado = { success: true; compartible: boolean } | { success: false; error: string };

export async function alternarCursoCompartible(
  _prevState: Resultado | null,
  formData: FormData
): Promise<Resultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede compartir un curso." };
  }

  const parsed = esquema.safeParse({ courseId: formData.get("courseId") });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const curso = await prisma.courses.findUnique({ where: { id: parsed.data.courseId } });

  // Mismo chequeo de propiedad que el resto de acciones sobre un curso: el
  // dueño y nadie más.
  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "No encontramos ese curso entre los tuyos." };
  }

  try {
    const actualizado = await prisma.courses.update({
      where: { id: curso.id },
      data: { compartible: !curso.compartible },
    });

    revalidatePath(`/tutor/cursos/${curso.id}`);
    revalidatePath("/tutor/cursos");
    // La ficha pública de este curso, que acaba de aparecer o desaparecer.
    // El índice del catálogo todavía no existe (US48).
    revalidatePath(`/tutor/catalogo/${curso.id}`);

    return { success: true, compartible: actualizado.compartible };
  } catch (error) {
    console.error("Error al cambiar si el curso es compartible:", error);
    return { success: false, error: "No se pudo guardar el cambio. Intenta de nuevo." };
  }
}
