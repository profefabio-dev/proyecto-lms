"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US12: el Tutor reordena los contenidos de un curso con un campo/control de
 * orden (en vez de arrastrar-soltar, que exigiría una librería de drag&drop
 * adicional para un beneficio marginal sobre dos botones "subir"/"bajar").
 *
 * Mover un contenido intercambia su valor de `orden` con el del contenido
 * vecino inmediato (el de mayor `orden` que sea menor, o el de menor `orden`
 * que sea mayor, según la dirección) dentro del mismo curso. Si ya está en
 * un extremo de la lista, no hay vecino y no se hace nada — no es un error.
 */
const moverContenidoSchema = z.object({
  contentId: z.string().min(1, "Contenido inválido"),
  direccion: z.enum(["arriba", "abajo"]),
});

type ResultadoMoverContenido = { success: true } | { success: false; error: string };

export async function moverContenido(
  _prevState: ResultadoMoverContenido | null,
  formData: FormData
): Promise<ResultadoMoverContenido> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede reordenar contenido." };
  }

  const parsed = moverContenidoSchema.safeParse({
    contentId: formData.get("contentId"),
    direccion: formData.get("direccion"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { contentId, direccion } = parsed.data;

  const contenido = await prisma.contents.findUnique({ where: { id: contentId } });

  if (!contenido) {
    return { success: false, error: "Este contenido no existe." };
  }

  const curso = await prisma.courses.findUnique({ where: { id: contenido.courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no te pertenece." };
  }

  const vecino = await prisma.contents.findFirst({
    where: {
      courseId: contenido.courseId,
      orden: direccion === "arriba" ? { lt: contenido.orden } : { gt: contenido.orden },
    },
    orderBy: { orden: direccion === "arriba" ? "desc" : "asc" },
  });

  if (!vecino) {
    // Ya está en el extremo de la lista (primero o último); no hay nada
    // que intercambiar.
    return { success: true };
  }

  try {
    await prisma.$transaction([
      prisma.contents.update({ where: { id: contenido.id }, data: { orden: vecino.orden } }),
      prisma.contents.update({ where: { id: vecino.id }, data: { orden: contenido.orden } }),
    ]);

    revalidatePath(`/tutor/cursos/${contenido.courseId}`);
    revalidatePath(`/estudiante/cursos/${contenido.courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error reordenando contenido:", error);
    return { success: false, error: "No se pudo reordenar el contenido. Intenta de nuevo." };
  }
}
