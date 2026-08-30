/**
 * US17: filtro de búsqueda por palabra clave, reutilizado tanto para
 * cursos como para contenidos — en ambos casos el criterio de aceptación
 * pide lo mismo: coincidencias por título o descripción, sin distinguir
 * mayúsculas/minúsculas. Es una función pura (no toca Prisma) para poder
 * probarla de forma aislada, igual que `obtenerEstadoEstudiante` o
 * `calcularProgreso`.
 */
export function construirFiltroBusqueda(termino: string) {
  return {
    OR: [
      { titulo: { contains: termino, mode: "insensitive" as const } },
      { descripcion: { contains: termino, mode: "insensitive" as const } },
    ],
  };
}
