"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol, EstadoUsuario } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { filtroUsuarioVisibleEnEspacio } from "@/lib/espacio-scope";

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

  // US50 (25/11/2026): solo se pueden inscribir estudiantes del propio
  // espacio. Es la misma comprobación que ahora hace la página al armar el
  // selector, repetida aquí **porque esta es la que de verdad manda**: sin
  // ella, un Tutor que conozca el id de un estudiante de otro colegio podría
  // inscribirlo enviando la petición a mano, sin pasar por la interfaz.
  //
  // Esto se intentó el 16/09/2026 y hubo que revertirlo el mismo día: el
  // filtro de entonces exigía una inscripción previa en el espacio, así que
  // ningún estudiante recién creado (US06 o la carga masiva de US29) podía
  // asignarse nunca a ningún curso. Lo que faltaba no era el filtro sino el
  // dato: desde US50 la cuenta guarda en qué espacio se creó, y el filtro
  // acepta las dos vías, así que el caso que lo rompió ya está cubierto.
  //
  // Lo que US26 permite —que un mismo Estudiante esté en cursos de dos
  // espacios distintos, sin duplicar su cuenta— sigue siendo cierto y
  // soportado; lo que ya no se puede es **descubrirlo** desde otro espacio.
  // Traerlo a propósito es otra historia (el código de inscripción, ver
  // `Backlog.md`), no un efecto secundario de que el selector lo listara.
  //
  // 17/09/2026, pedido por el docente: un estudiante con matrícula
  // cancelada (desactivado por un Administrador, US20) no debe poder
  // asignarse a un curso nuevo.
  const estudiantesValidos = await prisma.users.findMany({
    where: {
      ...filtroUsuarioVisibleEnEspacio(usuarioActual.espacioId ?? "", Rol.ESTUDIANTE),
      id: { in: estudianteIds },
      estado: EstadoUsuario.ACTIVO,
    },
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