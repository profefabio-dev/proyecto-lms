import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";

/**
 * Épica Multi-docente (Backlog.md, US24): filtro de Prisma para "usuarios
 * visibles desde un espacio". Administradores y Tutores se filtran
 * directamente por su propio `espacioId`; un Super Administrador no tiene
 * `espacioId` y nunca aparece en un listado scoped a un espacio concreto.
 *
 * Un Estudiante es una cuenta única y compartida entre espacios (decisión
 * del 02/09/2026, ver `Backlog.md`), así que tampoco tiene `espacioId`
 * propio. Se considera visible desde un espacio por **dos** vías, y basta
 * una:
 *
 *   1. Tiene al menos una inscripción (`CourseUsers`) en un curso de un
 *      Tutor de ese espacio.
 *   2. **US50 (25/11/2026):** su cuenta se creó en ese espacio
 *      (`espacioOrigenId`).
 *
 * La segunda vía es nueva y es la que hacía falta. Con solo la primera, un
 * estudiante recién creado no pertenecía a ningún espacio hasta que alguien
 * lo inscribía en un curso: desaparecía de `/tutor/estudiantes` justo después
 * de crearlo, y —peor— obligaba al selector de "Inscribir estudiantes" a no
 * usar este filtro en absoluto. Se intentó aplicarlo el 16/09/2026 y hubo que
 * revertirlo el mismo día, porque ningún estudiante nuevo podía asignarse
 * nunca; el selector quedó entonces mostrando a todos los estudiantes activos
 * de la plataforma, con nombre y correo, incluidos los de otros colegios.
 *
 * El `OR` solo **agrega** visibilidad, nunca la quita: ningún estudiante que
 * hoy se vea desde un espacio deja de verse por este cambio.
 *
 * Sin `rol`, devuelve el `OR` de ambos casos, para listados mixtos como
 * `/admin/usuarios` sin filtrar por rol.
 */
export function filtroUsuarioVisibleEnEspacio(espacioId: string, rol?: Rol) {
  const filtroEstudianteDelEspacio = {
    rol: Rol.ESTUDIANTE,
    OR: [
      { inscripciones: { some: { course: { tutor: { espacioId } } } } },
      { espacioOrigenId: espacioId },
    ],
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
 *
 * US50: para un Estudiante se comprueban las mismas dos vías que en el
 * filtro de arriba, y por el mismo motivo — sin la segunda, un Tutor no
 * podía corregirle el nombre ni restablecerle la contraseña a un estudiante
 * que acababa de crear, porque todavía no lo había inscrito en nada. Se
 * comprueba primero el espacio de origen, que no cuesta una consulta.
 */
export async function usuarioVisibleEnEspacio(
  usuarioObjetivo: {
    id: string;
    rol: Rol;
    espacioId: string | null;
    espacioOrigenId: string | null;
  },
  espacioId: string
): Promise<boolean> {
  if (usuarioObjetivo.rol === Rol.ADMINISTRADOR || usuarioObjetivo.rol === Rol.TUTOR) {
    return usuarioObjetivo.espacioId === espacioId;
  }

  if (usuarioObjetivo.rol === Rol.ESTUDIANTE) {
    if (usuarioObjetivo.espacioOrigenId === espacioId) {
      return true;
    }

    const inscripcion = await prisma.courseUsers.findFirst({
      where: { userId: usuarioObjetivo.id, course: { tutor: { espacioId } } },
      select: { id: true },
    });
    return inscripcion !== null;
  }

  return false;
}
