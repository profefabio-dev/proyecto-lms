import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";

/**
 * Épica Multi-docente (Backlog.md, US24): filtro de Prisma para "usuarios
 * visibles desde un espacio". Administradores y Tutores se filtran
 * directamente por su propio `espacioId`; un Estudiante (cuenta única y
 * compartida entre espacios — decisión del 02/09/2026, ver `Backlog.md`)
 * se considera visible desde un espacio si tiene al menos una inscripción
 * (`CourseUsers`) en un curso de un Tutor de ese espacio — nunca por un
 * `espacioId` propio, que no tiene. Un Super Administrador tampoco tiene
 * `espacioId` y nunca aparece en un listado scoped a un espacio concreto.
 *
 * Sin `rol`, devuelve el `OR` de ambos casos, para listados mixtos como
 * `/admin/usuarios` sin filtrar por rol.
 */
export function filtroUsuarioVisibleEnEspacio(espacioId: string, rol?: Rol) {
  const filtroEstudianteDelEspacio = {
    rol: Rol.ESTUDIANTE,
    inscripciones: { some: { course: { tutor: { espacioId } } } },
  };

  if (rol === Rol.ESTUDIANTE) {
    return filtroEstudianteDelEspacio;
  }

  if (rol) {
    return { rol, espacioId };
  }

  return {
    OR: [
      { rol: { in: [Rol.ADMINISTRADOR, Rol.TUTOR] }, espacioId },
      filtroEstudianteDelEspacio,
    ],
  };
}

/**
 * Comprueba si un usuario objetivo es visible/gestionable desde un espacio
 * dado. Usada en las Server Actions de edición (nombre, email, contraseña,
 * estado) para que un Administrador/Tutor de un espacio no pueda leer ni
 * escribir datos de un usuario de otro espacio aunque conozca su ID
 * directamente — criterio de aceptación de US24. Un Super Administrador
 * objetivo nunca es visible desde un espacio (no pertenece a ninguno).
 */
export async function usuarioVisibleEnEspacio(
  usuarioObjetivo: { id: string; rol: Rol; espacioId: string | null },
  espacioId: string
): Promise<boolean> {
  if (usuarioObjetivo.rol === Rol.ADMINISTRADOR || usuarioObjetivo.rol === Rol.TUTOR) {
    return usuarioObjetivo.espacioId === espacioId;
  }

  if (usuarioObjetivo.rol === Rol.ESTUDIANTE) {
    const inscripcion = await prisma.courseUsers.findFirst({
      where: { userId: usuarioObjetivo.id, course: { tutor: { espacioId } } },
      select: { id: true },
    });
    return inscripcion !== null;
  }

  return false;
}
