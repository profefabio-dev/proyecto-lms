"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { registrarContenidosVistos } from "@/lib/progress-tracking";
import {
  filtrarContenidosAccesibles,
  ordenarLecciones,
  ubicarLeccion,
} from "@/lib/course-lessons";

const completarLeccionSchema = z.object({
  contentId: z.string().trim().min(1, "Falta la lección."),
});

/**
 * US43 — "Completar y continuar" del reproductor de lecciones.
 *
 * Hace lo mismo que `marcarContenidoVisto` (US19) y además lleva al
 * estudiante a la lección siguiente, que es el gesto natural del
 * reproductor: no hay que volver al temario entre una lección y otra.
 *
 * La lección destino se calcula AQUÍ, en el servidor, y no se recibe del
 * formulario: si el cliente mandara el href, bastaría con editarlo para
 * saltar a una lección de una sección que el tutor todavía no habilitó.
 * Se reusa el mismo criterio de accesibilidad que el temario y el
 * reproductor (`filtrarContenidosAccesibles`), así que lo que no se puede
 * ver tampoco se puede alcanzar por este camino.
 */
export async function completarLeccion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false as const, error: "No autenticado." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== "ESTUDIANTE") {
    return { success: false as const, error: "No autorizado." };
  }

  const parsed = completarLeccionSchema.safeParse({ contentId: formData.get("contentId") });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const contenido = await prisma.contents.findUnique({ where: { id: parsed.data.contentId } });

  if (!contenido || !contenido.visible) {
    return { success: false as const, error: "La lección no existe." };
  }

  // Mismo chequeo de inscripción que la página del curso (US11).
  const inscripcion = await prisma.courseUsers.findFirst({
    where: { courseId: contenido.courseId, userId: usuarioActual.id },
  });

  if (!inscripcion) {
    return { success: false as const, error: "No estás inscrito en este curso." };
  }

  await registrarContenidosVistos(usuarioActual.id, [contenido.id]);

  // Secuencia de lecciones accesibles del curso, para saber cuál sigue.
  const [contenidos, secciones] = await Promise.all([
    prisma.contents.findMany({
      where: { courseId: contenido.courseId },
      orderBy: { orden: "asc" },
      select: { id: true, visible: true, seccionId: true },
    }),
    prisma.secciones.findMany({
      where: { courseId: contenido.courseId },
      orderBy: { orden: "asc" },
      select: { id: true, estado: true },
    }),
  ]);

  type ContenidoDelCurso = (typeof contenidos)[number];
  type SeccionDelCurso = (typeof secciones)[number];

  const lecciones = ordenarLecciones<ContenidoDelCurso, SeccionDelCurso>(
    filtrarContenidosAccesibles<ContenidoDelCurso, SeccionDelCurso>(contenidos, secciones),
    secciones
  );
  const { siguiente } = ubicarLeccion<ContenidoDelCurso>(lecciones, contenido.id);

  revalidatePath(`/estudiante/cursos/${contenido.courseId}`);
  revalidatePath("/estudiante");

  // Al terminar la última lección se vuelve al temario: ahí está el resumen
  // de avance al 100%, las actividades y las evaluaciones del curso.
  redirect(
    siguiente
      ? `/estudiante/cursos/${contenido.courseId}/lecciones/${siguiente.id}`
      : `/estudiante/cursos/${contenido.courseId}`
  );
}
