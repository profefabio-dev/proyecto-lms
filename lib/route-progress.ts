import { calcularProgreso } from "@/lib/course-progress";

/**
 * US44 — avance de un Estudiante a lo largo de una ruta de aprendizaje.
 *
 * El criterio es el que espera cualquiera que mire la barra: la ruta va al
 * 50% cuando se ha visto la mitad de TODAS sus lecciones, no cuando se ha
 * terminado la mitad de los cursos. Si un curso tiene 20 lecciones y el
 * siguiente 2, terminar el primero no puede valer lo mismo que terminar el
 * segundo — por eso se suman lecciones y no cursos.
 *
 * Igual que `calcularProgreso` y `course-lessons`, no toca Prisma: recibe
 * los conteos ya resueltos por la página.
 */
export type AvanceDeCurso = {
  courseId: string;
  /** Lecciones accesibles del curso (el contenido oculto no cuenta). */
  total: number;
  /** Lecciones que el estudiante ya marcó como completadas. */
  vistas: number;
};

export type AvanceDeRuta = {
  /** Porcentaje de la ruta completa, 0-100. */
  progreso: number;
  leccionesVistas: number;
  leccionesTotales: number;
  cursosCompletados: number;
  /** Cursos de la ruta que ya tienen al menos una lección publicada. */
  cursosConContenido: number;
};

export function calcularAvanceDeRuta(cursos: AvanceDeCurso[]): AvanceDeRuta {
  const leccionesTotales = cursos.reduce((suma, curso) => suma + curso.total, 0);
  const leccionesVistas = cursos.reduce((suma, curso) => suma + curso.vistas, 0);

  // Un curso sin lecciones publicadas no está "completado": está vacío.
  // Contarlo como completo dejaría la ruta en 100% sin que el estudiante
  // haya visto nada.
  const cursosConContenido = cursos.filter((curso) => curso.total > 0).length;
  const cursosCompletados = cursos.filter(
    (curso) => curso.total > 0 && curso.vistas >= curso.total
  ).length;

  return {
    progreso: calcularProgreso(leccionesVistas, leccionesTotales),
    leccionesVistas,
    leccionesTotales,
    cursosCompletados,
    cursosConContenido,
  };
}

/**
 * El curso por el que conviene retomar la ruta: el primero que no esté
 * completo, siguiendo el orden que definió el Tutor. Los cursos vacíos se
 * saltan — no hay nada que hacer en ellos todavía.
 *
 * Si ya están todos completos (o la ruta no tiene cursos con contenido)
 * devuelve `null` y la página muestra la ruta terminada en vez de un botón
 * que no lleva a ninguna parte.
 */
export function siguienteCursoDeRuta<C extends AvanceDeCurso>(cursos: C[]): C | null {
  return cursos.find((curso) => curso.total > 0 && curso.vistas < curso.total) ?? null;
}
