"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol, EstadoRuta } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const cambiarEstadoSchema = z.object({
  rutaId: z.string().min(1, "Ruta inválida"),
});

type ResultadoCambiarEstado =
  | { success: true; estado: EstadoRuta }
  | { success: false; error: string };

/**
 * US44: publicar o despublicar una ruta.
 *
 * Una ruta vacía no se puede publicar: aparecería en el catálogo del
 * estudiante como un camino sin pasos, y asociarse a ella no le daría
 * acceso a nada. Despublicar, en cambio, siempre se puede — y no desinscribe
 * a nadie: quien ya la estaba recorriendo conserva sus cursos y su avance,
 * simplemente la ruta deja de ofrecerse a estudiantes nuevos.
 */
export async function cambiarEstadoRuta(
  _prevState: ResultadoCambiarEstado | null,
  formData: FormData
): Promise<ResultadoCambiarEstado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede publicar una ruta." };
  }

  const parsed = cambiarEstadoSchema.safeParse({ rutaId: formData.get("rutaId") });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const ruta = await prisma.rutas.findUnique({
    where: { id: parsed.data.rutaId },
    include: { _count: { select: { cursos: true } } },
  });

  if (!ruta || ruta.tutorId !== usuarioActual.id) {
    return { success: false, error: "Esta ruta no existe o no te pertenece." };
  }

  const nuevoEstado =
    ruta.estado === EstadoRuta.PUBLICADA ? EstadoRuta.BORRADOR : EstadoRuta.PUBLICADA;

  if (nuevoEstado === EstadoRuta.PUBLICADA && ruta._count.cursos === 0) {
    return {
      success: false,
      error: "Agrega al menos un curso a la ruta antes de publicarla.",
    };
  }

  try {
    await prisma.rutas.update({
      where: { id: ruta.id },
      data: { estado: nuevoEstado },
    });

    revalidatePath(`/tutor/rutas/${ruta.id}`);
    revalidatePath("/tutor/rutas");
    revalidatePath("/estudiante/rutas");

    return { success: true, estado: nuevoEstado };
  } catch (error) {
    console.error("Error cambiando el estado de la ruta:", error);
    return { success: false, error: "No se pudo cambiar el estado. Intenta de nuevo." };
  }
}
