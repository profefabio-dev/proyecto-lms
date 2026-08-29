/**
 * US19: porcentaje de avance de un Estudiante en un curso.
 *
 * Un contenido cuenta como "visto" cuando existe un registro en
 * `ContentViews` para ese contenido y ese estudiante — se marca
 * automáticamente al abrir la página de detalle del curso, no por una
 * acción manual (ver `lib/progress-tracking.ts`). Esta función solo hace
 * el cálculo a partir de los conteos ya resueltos (vistos vs. total de
 * contenidos visibles del curso); no toca Prisma, así que se puede probar
 * de forma aislada, igual que `obtenerEstadoEstudiante` en
 * `lib/course-status.ts`.
 */
export function calcularProgreso(vistos: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  const porcentaje = (vistos / total) * 100;
  return Math.round(Math.min(100, Math.max(0, porcentaje)));
}
