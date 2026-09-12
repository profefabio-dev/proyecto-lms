/**
 * US30: agrupa el contenido de un curso por sección para las dos páginas de
 * detalle (Tutor y Estudiante), sin tocar Prisma — solo reorganiza arreglos
 * ya resueltos, así se puede probar de forma aislada (mismo criterio que
 * `calcularProgreso` en `course-progress.ts`).
 *
 * El contenido sin sección (`seccionId: null`) se devuelve aparte, en vez de
 * como un grupo más, porque debe comportarse exactamente igual que antes de
 * US30 en ambas páginas: lista plana, siempre visible, sin encabezado de
 * sección — decisión acordada con el docente (08/09/2026) para no forzar el
 * modelo de secciones sobre cursos que nunca lo usaron.
 */
type ContenidoConSeccion = { seccionId: string | null };
type SeccionBase = { id: string };

export function agruparContenidoPorSeccion<C extends ContenidoConSeccion, S extends SeccionBase>(
  contenidos: C[],
  secciones: S[]
): { seccion: S; contenidos: C[] }[] {
  return secciones.map((seccion) => ({
    seccion,
    contenidos: contenidos.filter((contenido) => contenido.seccionId === seccion.id),
  }));
}

export function contenidoSinSeccion<C extends ContenidoConSeccion>(contenidos: C[]): C[] {
  return contenidos.filter((contenido) => contenido.seccionId === null);
}
