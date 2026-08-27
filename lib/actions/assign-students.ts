"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const asignarEstudiantesSchema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
  estudianteIds: z.array(z.string().min(1)).min(1, "Selecciona al menos un estudiante"),
});

type ResultadoAsignarEstudiantes =
  | { success: true; asignados: number }
  | { success: false; error: string };

export async function asignarEstudiantes(
  _prevState: ResultadoAsignarEstudiantes | null,
  formData: FormData
): Promise<ResultadoAsignarEstudiantes> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede asignar estudiantes a un curso." };
  }

  const parsed = asignarEstudiantesSchema.safeParse({
    courseId: formData.get("courseId"),
    estudianteIds: formData.getAll("estudianteIds"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { courseId, estudianteIds } = parsed.data;

  const curso = await prisma.courses.findUnique({ where: { id: courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no existe o no te pertenece." };
  }

  const estudiantesValidos = await prisma.users.findMany({
    where: { id: { in: estudianteIds }, rol: Rol.ESTUDIANTE },
    select: { id: true },
  });

  const idsValidos = new Set(estudiantesValidos.map((estudiante) => estudiante.id));

  const yaInscritos = await prisma.courseUsers.findMany({
    where: { courseId, userId: { in: estudianteIds } },
    select: { userId: true },
  });

  const idsYaInscritos = new Set(yaInscritos.map((inscripcion) => inscripcion.userId));

  const nuevosIds = estudianteIds.filter(
    (id) => idsValidos.has(id) && !idsYaInscritos.has(id)
  );

  try {
    if (nuevosIds.length > 0) {
      await prisma.courseUsers.createMany({
        data: nuevosIds.map((userId) => ({ courseId, userId })),
      });
    }

    revalidatePath(`/tutor/cursos/${courseId}`);

    return { success: true, asignados: nuevosIds.length };
  } catch (error) {
    console.error("Error asignando estudiantes:", error);
    return { success: false, error: "No se pudo completar la asignación. Intenta de nuevo." };
  }
}