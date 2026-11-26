/**
 * US51 — Código de clase / clave de inscripción para cursos.
 *
 * Inspirado en Google Classroom (código de clase) y Moodle (clave de inscripción).
 * Permite que un docente comparta un código corto de 8 caracteres (formato XXXX-XXXX)
 * derivado del identificador único del curso, para que cualquier estudiante con cuenta
 * activa se inscriba al instante sin necesidad de carga masiva ni búsqueda manual.
 */

/** Cuántos caracteres tiene el código, sin contar el guion. */
export const LARGO_CODIGO_CURSO = 8;

/**
 * Genera el código legible de 8 caracteres en formato XXXX-XXXX a partir del ID del curso.
 * Ejemplo: "c8e14b2d-1234-..." -> "C8E1-4B2D"
 */
export function formatearCodigoCurso(courseId: string): string {
  const limpio = courseId.replace(/-/g, "").slice(0, LARGO_CODIGO_CURSO).toUpperCase();
  if (limpio.length >= LARGO_CODIGO_CURSO) {
    return `${limpio.slice(0, 4)}-${limpio.slice(4, LARGO_CODIGO_CURSO)}`;
  }
  return limpio;
}

/**
 * Normaliza cualquier entrada del estudiante (con o sin guiones, mayúsculas o minúsculas)
 * para buscar coincidencias.
 * Ejemplo: "c8e1-4b2d" o "C8E14B2D" -> "c8e14b2d"
 */
export function normalizarCodigoCurso(codigo: string): string {
  return codigo.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

/**
 * El código que le corresponde a un curso, ya normalizado — lo mismo que
 * `normalizarCodigoCurso(formatearCodigoCurso(id))`, pero en un solo paso.
 *
 * Existe para que la comparación viva en un sitio y esté probada:
 * `unirseACursoConCodigo` filtra en la base de datos por el comienzo del id
 * y después confirma acá la coincidencia exacta. Antes del 26/11/2026 esa
 * comparación era un `startsWith` de cuatro caracteres escrito dentro de la
 * acción, que aceptaba códigos incompletos.
 */
export function codigoDelCurso(courseId: string): string {
  return normalizarCodigoCurso(courseId).slice(0, LARGO_CODIGO_CURSO);
}

/**
 * Si lo que escribió alguien tiene **la forma** de un código de clase: ocho
 * caracteres alfanuméricos, con guion o sin él, en mayúsculas o minúsculas.
 * No dice que el curso exista, solo que vale la pena buscarlo por código —
 * es lo que usa el buscador del campus para distinguir "ABCD-1234" de
 * "robótica" sin hacerle una consulta de más a la base de datos.
 */
export function esFormaDeCodigo(texto: string): boolean {
  return normalizarCodigoCurso(texto).length === LARGO_CODIGO_CURSO;
}

/**
 * El fragmento de consulta que encuentra un curso por su código: filtra por
 * el **comienzo del id**, que es su clave primaria y de donde sale el
 * código. `insensitive` porque el id se guarda en minúsculas y el código se
 * suele escribir en mayúsculas.
 *
 * La coincidencia exacta se confirma después con `cursosQueCoinciden` — este
 * filtro es solo para que la base de datos no devuelva toda la tabla.
 */
export function filtroPorCodigoCurso(codigoLimpio: string) {
  return { startsWith: codigoLimpio, mode: "insensitive" as const };
}

/**
 * Los cursos cuyo código es **exactamente** el buscado. Devuelve la lista y
 * no el primero a propósito: quien llama decide qué hacer con cero y con más
 * de uno, y dos cursos distintos no pueden terminar siendo "el mismo" por un
 * `.find()` silencioso (ver la cabecera de `join-course-by-code.ts`).
 */
export function cursosQueCoinciden<T extends { id: string }>(
  cursos: T[],
  codigoLimpio: string
): T[] {
  return cursos.filter((c) => codigoDelCurso(c.id) === codigoLimpio);
}
