import type { EstadoCurso } from "@prisma/client";

/**
 * US14: el Estudiante ve el estado de cada curso en el que está inscrito.
 *
 * El modelo `Courses` maneja tres estados internos (`BORRADOR`, `PUBLICADO`,
 * `ARCHIVADO`) pensados para el flujo de trabajo del Tutor, pero el criterio
 * de aceptación de esta historia solo pide "activo/finalizado" desde el
 * punto de vista del Estudiante. Este mapeo traduce uno al otro:
 * - `PUBLICADO` → "Activo": el curso está en curso, con contenido visible.
 * - `ARCHIVADO` → "Finalizado": el Tutor lo cerró, ya no se dicta.
 * - `BORRADOR` → se etiqueta igual como transparencia (no debería ocurrir en
 *   la práctica, ya que un Tutor normalmente no asigna estudiantes a un
 *   curso que todavía no ha publicado, pero no hay ninguna restricción en
 *   el código que lo impida hoy).
 */
export type EstadoCursoEstudiante = {
  label: string;
  className: string;
};

export function obtenerEstadoEstudiante(estado: EstadoCurso): EstadoCursoEstudiante {
  switch (estado) {
    case "PUBLICADO":
      return { label: "Activo", className: "bg-green-100 text-green-800" };
    case "ARCHIVADO":
      return { label: "Finalizado", className: "bg-gray-200 text-gray-700" };
    case "BORRADOR":
      return { label: "Borrador", className: "bg-yellow-100 text-yellow-800" };
  }
}
