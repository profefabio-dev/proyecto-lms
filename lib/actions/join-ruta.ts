"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol, EstadoUsuario, EstadoRuta, EstadoCurso } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const asociarseSchema = z.object({
  rutaId: z.string().min(1, "Ruta inválida"),
});

type ResultadoAsociarse =
  | { success: true; cursosInscritos: number }
  | { success: false; error: string };

/**
 * US44: el Estudiante se asocia a una ruta de aprendizaje.
 *
 * Es la acción central de la épica, y la que justifica el diseño: asociarse
 * crea la fila en `RutaUsuarios` y además lo inscribe en los cursos
 * PUBLICADOS de la ruta (`CourseUsers`). Así la ruta no necesita su propio
 * sistema de permisos: el acceso al contenido sigue decidiéndose por la
 * inscripción al curso, exactamente igual que cuando el Tutor asigna
 * estudiantes a mano (US26).
 *
 * `skipDuplicates` hace que sea idempotente y que no pise inscripciones
 * previas: un estudiante que ya estaba en uno de los cursos conserva su
 * inscripción —y con ella su avance, sus entregas y sus notas— y solo se le
 * agregan los cursos que le faltaban.
 */
export async function asociarseARuta(
  _prevState: ResultadoAsociarse | null,
  formData: FormData
): Promise<ResultadoAsociarse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.ESTUDIANTE) {
    return { success: false, error: "Solo un estudiante puede asociarse a una ruta." };
  }

  // Mismo criterio que `asignarEstudiantes` (17/09/2026): una matrícula
  // cancelada no puede inscribirse en cursos nuevos, ni por esta vía.
  if (usuarioActual.estado !== EstadoUsuario.ACTIVO) {
    return { success: false, error: "Tu matrícula está inactiva. Habla con tu docente." };
  }

  const parsed = asociarseSchema.safeParse({ rutaId: formData.get("rutaId") });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const ruta = await prisma.rutas.findUnique({
    where: { id: parsed.data.rutaId },
    include: {
      cursos: {
        orderBy: { orden: "asc" },
        include: { course: { select: { id: true, estado: true } } },
      },
    },
  });

  if (!ruta || ruta.estado !== EstadoRuta.PUBLICADA) {
    return { success: false, error: "Esta ruta no está disponible." };
  }

  const cursosPublicados = ruta.cursos
    .filter((fila) => fila.course.estado === EstadoCurso.PUBLICADO)
    .map((fila) => fila.course.id);

  try {
    await prisma.rutaUsuarios.upsert({
      where: { rutaId_userId: { rutaId: ruta.id, userId: usuarioActual.id } },
      create: { rutaId: ruta.id, userId: usuarioActual.id },
      update: {},
    });

    let cursosInscritos = 0;

    if (cursosPublicados.length > 0) {
      const resultado = await prisma.courseUsers.createMany({
        data: cursosPublicados.map((courseId) => ({ courseId, userId: usuarioActual.id })),
        skipDuplicates: true,
      });
      cursosInscritos = resultado.count;
    }

    revalidatePath("/estudiante/rutas");
    revalidatePath(`/estudiante/rutas/${ruta.id}`);
    revalidatePath("/estudiante");

    return { success: true, cursosInscritos };
  } catch (error) {
    console.error("Error asociándose a la ruta:", error);
    return { success: false, error: "No se pudo asociar a la ruta. Intenta de nuevo." };
  }
}
