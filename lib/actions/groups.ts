"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { usuarioVisibleEnEspacio } from "@/lib/espacio-scope";

export type ResultadoAccionGrupo =
  | { success: true; mensaje: string; matriculados?: number; yaInscritos?: number }
  | { success: false; error: string };

const esquemaCrear = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre del grupo no puede estar vacío")
    .max(30, "El nombre no puede exceder 30 caracteres"),
});

const esquemaRenombrar = z.object({
  grupoId: z.string().min(1, "Grupo no especificado"),
  nombre: z
    .string()
    .trim()
    .min(1, "El nuevo nombre no puede estar vacío")
    .max(30, "El nombre no puede exceder 30 caracteres"),
});

const esquemaId = z.object({
  grupoId: z.string().min(1, "Grupo no especificado"),
});

async function obtenerUsuarioGestion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const usuario = await prisma.users.findUnique({ where: { authId: user.id } });
  if (!usuario || (usuario.rol !== Rol.TUTOR && usuario.rol !== Rol.ADMINISTRADOR)) {
    return null;
  }

  if (!usuario.espacioId) return null;

  return usuario;
}

/**
 * US32: Crear un grupo escolar (ej. "6A", "7B") en el espacio del docente.
 */
export async function crearGrupo(
  _prevState: ResultadoAccionGrupo | null,
  formData: FormData
): Promise<ResultadoAccionGrupo> {
  const usuario = await obtenerUsuarioGestion();
  if (!usuario || !usuario.espacioId) {
    return { success: false, error: "No tienes permiso para gestionar grupos." };
  }

  const parsed = esquemaCrear.safeParse({ nombre: formData.get("nombre") });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Nombre inválido." };
  }

  const nombreNormalizado = parsed.data.nombre.toUpperCase();

  const existente = await prisma.grupos.findUnique({
    where: {
      nombre_espacioId: {
        nombre: nombreNormalizado,
        espacioId: usuario.espacioId,
      },
    },
  });

  if (existente) {
    return { success: false, error: `Ya existe un grupo con el nombre "${nombreNormalizado}" en tu colegio.` };
  }

  try {
    await prisma.grupos.create({
      data: {
        nombre: nombreNormalizado,
        espacioId: usuario.espacioId,
      },
    });

    revalidatePath("/tutor/grupos");
    revalidatePath("/tutor/estudiantes");

    return { success: true, mensaje: `Grupo "${nombreNormalizado}" creado exitosamente.` };
  } catch (err) {
    console.error("Error creando grupo:", err);
    return { success: false, error: "Error al guardar el grupo en la base de datos." };
  }
}

/**
 * US32: Renombrar un grupo existente del propio espacio.
 */
export async function renombrarGrupo(
  _prevState: ResultadoAccionGrupo | null,
  formData: FormData
): Promise<ResultadoAccionGrupo> {
  const usuario = await obtenerUsuarioGestion();
  if (!usuario || !usuario.espacioId) {
    return { success: false, error: "No tienes permiso para gestionar grupos." };
  }

  const parsed = esquemaRenombrar.safeParse({
    grupoId: formData.get("grupoId"),
    nombre: formData.get("nombre"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." };
  }

  const { grupoId, nombre } = parsed.data;
  const nombreNormalizado = nombre.toUpperCase();

  const grupo = await prisma.grupos.findUnique({ where: { id: grupoId } });
  if (!grupo || grupo.espacioId !== usuario.espacioId) {
    return { success: false, error: "El grupo no existe o pertenece a otro colegio." };
  }

  // Verificar que el nuevo nombre no colisione con otro grupo del mismo espacio
  if (grupo.nombre !== nombreNormalizado) {
    const colision = await prisma.grupos.findUnique({
      where: {
        nombre_espacioId: {
          nombre: nombreNormalizado,
          espacioId: usuario.espacioId,
        },
      },
    });
    if (colision) {
      return { success: false, error: `Ya existe otro grupo llamado "${nombreNormalizado}".` };
    }
  }

  try {
    await prisma.$transaction([
      prisma.grupos.update({
        where: { id: grupoId },
        data: { nombre: nombreNormalizado },
      }),
      // Sincronizar el campo grado legacy en los estudiantes vinculados
      prisma.users.updateMany({
        where: { grupoId },
        data: { grado: nombreNormalizado },
      }),
    ]);

    revalidatePath("/tutor/grupos");
    revalidatePath("/tutor/estudiantes");

    return { success: true, mensaje: `Grupo actualizado a "${nombreNormalizado}".` };
  } catch (err) {
    console.error("Error renombrando grupo:", err);
    return { success: false, error: "Error al actualizar el nombre del grupo." };
  }
}

/**
 * US32: Eliminar un grupo. Los estudiantes conservan su cuenta y pasan a sin grupo.
 */
export async function eliminarGrupo(
  _prevState: ResultadoAccionGrupo | null,
  formData: FormData
): Promise<ResultadoAccionGrupo> {
  const usuario = await obtenerUsuarioGestion();
  if (!usuario || !usuario.espacioId) {
    return { success: false, error: "No tienes permiso para gestionar grupos." };
  }

  const parsed = esquemaId.safeParse({ grupoId: formData.get("grupoId") });
  if (!parsed.success) {
    return { success: false, error: "Grupo inválido." };
  }

  const grupo = await prisma.grupos.findUnique({ where: { id: parsed.data.grupoId } });
  if (!grupo || grupo.espacioId !== usuario.espacioId) {
    return { success: false, error: "El grupo no existe o pertenece a otro colegio." };
  }

  try {
    await prisma.grupos.delete({ where: { id: parsed.data.grupoId } });

    revalidatePath("/tutor/grupos");
    revalidatePath("/tutor/estudiantes");

    return { success: true, mensaje: `Grupo "${grupo.nombre}" eliminado.` };
  } catch (err) {
    console.error("Error eliminando grupo:", err);
    return { success: false, error: "Error al eliminar el grupo." };
  }
}

/**
 * US32: Asignar o desasignar el salón/grupo a un estudiante.
 */
export async function asignarGrupoEstudiante(
  _prevState: ResultadoAccionGrupo | null,
  formData: FormData
): Promise<ResultadoAccionGrupo> {
  const usuario = await obtenerUsuarioGestion();
  if (!usuario || !usuario.espacioId) {
    return { success: false, error: "No tienes permiso para gestionar estudiantes." };
  }

  const userId = formData.get("userId") as string;
  const grupoIdRaw = formData.get("grupoId") as string;
  const grupoId = grupoIdRaw && grupoIdRaw.trim() !== "" ? grupoIdRaw.trim() : null;

  if (!userId) {
    return { success: false, error: "Estudiante no especificado." };
  }

  let nombreGrupo: string | null = null;
  if (grupoId) {
    const grupo = await prisma.grupos.findUnique({ where: { id: grupoId } });
    if (!grupo || grupo.espacioId !== usuario.espacioId) {
      return { success: false, error: "El grupo seleccionado no existe en tu colegio." };
    }
    nombreGrupo = grupo.nombre;
  }

  // **El estudiante también se comprueba, no solo el grupo** (agregado el
  // 27/11/2026 al revisar esta acción). Sin esto, `userId` llega del
  // formulario y se escribe directo: bastaba con mandar el id de un
  // estudiante de otro colegio para meterlo en un grupo propio —y, de paso,
  // que `matricularGrupoEnCurso` lo inscribiera en un curso de este
  // espacio—. Es exactamente la fuga que US50 cerró en el selector de
  // "Inscribir estudiantes", y la misma regla: **ocultar un control no es
  // una restricción; la comprobación del servidor es la que manda.**
  const estudiante = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, rol: true, espacioId: true, espacioOrigenId: true },
  });

  if (!estudiante || estudiante.rol !== Rol.ESTUDIANTE) {
    // Y solo un Estudiante: `grupoId` en la cuenta de un Tutor no significa
    // nada, y esta acción no es la vía para tocar otra cuenta.
    return { success: false, error: "Ese estudiante no existe." };
  }

  if (!(await usuarioVisibleEnEspacio(estudiante, usuario.espacioId))) {
    return { success: false, error: "Ese estudiante no es de tu colegio." };
  }

  try {
    await prisma.users.update({
      where: { id: userId },
      data: {
        grupoId,
        grado: nombreGrupo,
      },
    });

    revalidatePath("/tutor/estudiantes");
    revalidatePath("/tutor/grupos");

    return { success: true, mensaje: "Grupo del estudiante actualizado." };
  } catch (err) {
    console.error("Error asignando grupo al estudiante:", err);
    return { success: false, error: "Error al actualizar el grupo del estudiante." };
  }
}

/**
 * US32 / US11: Matricular a todos los estudiantes activos de un grupo completo
 * en un curso específico con un solo clic.
 */
export async function matricularGrupoEnCurso(
  _prevState: ResultadoAccionGrupo | null,
  formData: FormData
): Promise<ResultadoAccionGrupo> {
  const usuario = await obtenerUsuarioGestion();
  if (!usuario || !usuario.espacioId) {
    return { success: false, error: "No tienes permiso para matricular estudiantes." };
  }

  const courseId = formData.get("courseId") as string;
  const grupoId = formData.get("grupoId") as string;

  if (!courseId || !grupoId) {
    return { success: false, error: "Curso o grupo no especificado." };
  }

  // Verificar que el curso pertenezca al tutor o a su espacio
  const curso = await prisma.courses.findUnique({
    where: { id: courseId },
    select: { id: true, titulo: true, tutorId: true, tutor: { select: { espacioId: true } } },
  });

  if (!curso) {
    return { success: false, error: "El curso no existe." };
  }

  // Autorización: debe ser el dueño del curso o admin del mismo espacio
  const puedeMatricular =
    (usuario.rol === Rol.TUTOR && curso.tutorId === usuario.id) ||
    (usuario.rol === Rol.ADMINISTRADOR && curso.tutor.espacioId === usuario.espacioId);

  if (!puedeMatricular) {
    return { success: false, error: "No tienes permiso para matricular estudiantes en este curso." };
  }

  const grupo = await prisma.grupos.findUnique({
    where: { id: grupoId },
    select: { id: true, nombre: true, espacioId: true },
  });

  if (!grupo || grupo.espacioId !== usuario.espacioId) {
    return { success: false, error: "El grupo no pertenece a tu colegio." };
  }

  // Buscar todos los estudiantes activos del grupo
  const estudiantesDelGrupo = await prisma.users.findMany({
    where: {
      grupoId,
      rol: Rol.ESTUDIANTE,
      estado: "ACTIVO",
    },
    select: { id: true },
  });

  if (estudiantesDelGrupo.length === 0) {
    return { success: false, error: `El grupo "${grupo.nombre}" no tiene estudiantes activos para matricular.` };
  }

  const idsEstudiantes = estudiantesDelGrupo.map((e) => e.id);

  // Consultar quiénes ya están inscritos en el curso
  const inscritosPreviamente = await prisma.courseUsers.findMany({
    where: {
      courseId,
      userId: { in: idsEstudiantes },
    },
    select: { userId: true },
  });

  const idsYaInscritos = new Set(inscritosPreviamente.map((i) => i.userId));
  const nuevosPorInscribir = idsEstudiantes.filter((id) => !idsYaInscritos.has(id));

  if (nuevosPorInscribir.length === 0) {
    return {
      success: true,
      matriculados: 0,
      yaInscritos: idsYaInscritos.size,
      mensaje: `Todos los ${idsYaInscritos.size} estudiantes del grupo "${grupo.nombre}" ya estaban matriculados en este curso.`,
    };
  }

  try {
    await prisma.courseUsers.createMany({
      data: nuevosPorInscribir.map((userId) => ({
        courseId,
        userId,
      })),
      skipDuplicates: true,
    });

    revalidatePath(`/tutor/cursos/${courseId}`);

    const textoNuevos = `${nuevosPorInscribir.length} ${nuevosPorInscribir.length === 1 ? "nuevo estudiante matriculado" : "nuevos estudiantes matriculados"}`;
    const textoPrevios = idsYaInscritos.size > 0 ? ` (${idsYaInscritos.size} ya estaban en el curso)` : "";

    return {
      success: true,
      matriculados: nuevosPorInscribir.length,
      yaInscritos: idsYaInscritos.size,
      mensaje: `¡Listo! Se asignó el grupo "${grupo.nombre}" a ${curso.titulo}: ${textoNuevos}${textoPrevios}.`,
    };
  } catch (err) {
    console.error("Error matriculando grupo en curso:", err);
    return { success: false, error: "Ocurrió un error al matricular el grupo en la base de datos." };
  }
}
