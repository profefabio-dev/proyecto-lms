/**
 * US42 — quién puede abrir la pantalla del curso del Estudiante
 * (25/11/2026).
 *
 * El docente pidió el 20/11 ver su curso tal como lo verá un estudiante,
 * sin salir de su sesión ni crear una cuenta de prueba: hoy publica a
 * ciegas. Al revisar la plataforma del colegio el 25/11 se confirmó que
 * ahí ese interruptor vive **permanente en la barra superior** ("Cambiar a
 * vista de estudiante"), no escondido — es algo que un docente usa todo el
 * tiempo.
 *
 * **La decisión de diseño: no se duplica la pantalla, se amplía quién
 * entra.** La historia original hablaba de una ruta aparte bajo `/tutor`
 * que reutilizara el mismo renderizado. Reutilizarlo de verdad obligaría a
 * extraer la página del temario **y** la del reproductor de lecciones
 * (US43) a componentes compartidos, y cualquier copia se separa de la
 * original con el primer cambio. Es más corto y más honesto dejar una sola
 * pantalla y aceptar un segundo caso de acceso: el Tutor **dueño** del
 * curso, en modo lectura.
 *
 * Lo que eso da gratis, y no es poco: el reproductor de lecciones funciona
 * sin tocarlo, y el avance y el estado de las actividades salen de las
 * consultas que ya filtran por `usuarioActual.id` — el Tutor no tiene
 * vistas ni entregas, así que ve **0 % y todo pendiente**, que es
 * exactamente lo que vería un estudiante que acaba de entrar. Era la
 * decisión que la historia dejaba abierta, y se resuelve sola.
 *
 * Sin Prisma, como el resto de `lib/`: recibe los datos ya consultados y se
 * prueba sola.
 */

export type Rol = "SUPERADMIN" | "ADMINISTRADOR" | "TUTOR" | "ESTUDIANTE";

export type ModoDeAcceso =
  /** Un estudiante inscrito: la pantalla completa, interactiva. */
  | { modo: "estudiante" }
  /** El tutor dueño del curso: la misma pantalla, de solo lectura. */
  | { modo: "vista_previa" }
  /** Cualquier otro caso. */
  | { modo: "denegado" };

export function accesoAlCurso(entrada: {
  rol: Rol;
  usuarioId: string;
  /** De quién es el curso. */
  tutorIdDelCurso: string;
  /** Si el usuario tiene inscripción en este curso. */
  tieneInscripcion: boolean;
}): ModoDeAcceso {
  const { rol, usuarioId, tutorIdDelCurso, tieneInscripcion } = entrada;

  if (rol === "ESTUDIANTE") {
    return tieneInscripcion ? { modo: "estudiante" } : { modo: "denegado" };
  }

  // Solo el dueño. Un Tutor de otro curso —o de otro colegio— no entra, ni
  // conociendo el id: es la misma regla que protege todo lo demás bajo
  // `/tutor/cursos/[courseId]` (US24), y la única excepción de todo el
  // proyecto sigue siendo la ficha del catálogo de un curso compartido.
  if (rol === "TUTOR" && usuarioId === tutorIdDelCurso) {
    return { modo: "vista_previa" };
  }

  // Un Administrador o un Super Administrador tampoco: esta pantalla es
  // material de clase, no administración, y nadie pidió que la vieran.
  return { modo: "denegado" };
}

/** Atajo para las pantallas, que casi siempre solo necesitan esto. */
export function esVistaPrevia(acceso: ModoDeAcceso): boolean {
  return acceso.modo === "vista_previa";
}
