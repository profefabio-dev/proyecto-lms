/**
 * US49 — qué necesita un curso para poder compartirse (24/11/2026).
 *
 * El docente planteó que debería haber un moderador que apruebe los cursos
 * antes de que circulen, y la respuesta fue separar dos problemas que no
 * son el mismo.
 *
 * El material **incompleto** —dos lecciones sueltas, sin descripción, sin
 * nada que evaluar— es el grueso de lo que ensuciaría un catálogo, y no
 * necesita que lo revise una persona: lo filtra esta función. El material
 * **completo pero flojo** sí necesita criterio humano, pero eso se resuelve
 * con el sello de verificado, no bloqueando la publicación: una cola de
 * aprobación pone a una sola persona a revisar curso por curso y desanima
 * justo lo que se quiere fomentar.
 *
 * El mensaje importa tanto como el filtro. "No cumple los requisitos" no
 * ayuda a nadie; "te falta una actividad o evaluación publicada" se puede
 * resolver en dos minutos. Por eso devuelve la lista de lo que falta, no
 * un booleano.
 *
 * Sin Prisma, como el resto de `lib/`, para poder probarla sola.
 */

export const MINIMO_LECCIONES = 3;
export const MINIMO_DESCRIPCION = 80;

export type CursoParaCompartir = {
  descripcion: string;
  imagen: string | null;
  /** Solo las visibles: una lección oculta no la va a ver quien lo adopte. */
  leccionesVisibles: number;
  actividadesVisibles: number;
  evaluacionesVisibles: number;
};

/**
 * Lo que le falta al curso, en frases que se le pueden mostrar al docente
 * tal cual. Vacío significa que ya se puede compartir.
 */
export function faltaParaCompartir(curso: CursoParaCompartir): string[] {
  const falta: string[] = [];

  if (curso.leccionesVisibles < MINIMO_LECCIONES) {
    const restantes = MINIMO_LECCIONES - curso.leccionesVisibles;
    falta.push(
      restantes === 1
        ? "una lección más publicada"
        : `${restantes} lecciones más publicadas`
    );
  }

  // Una u otra basta: hay cursos que se evalúan con trabajos y otros con
  // cuestionarios, y no hay motivo para exigir los dos.
  if (curso.actividadesVisibles + curso.evaluacionesVisibles === 0) {
    falta.push("una actividad o una evaluación publicada");
  }

  if (curso.descripcion.trim().length < MINIMO_DESCRIPCION) {
    falta.push("una descripción que explique de qué trata (mínimo un par de frases)");
  }

  if (!curso.imagen) {
    falta.push("una imagen de portada");
  }

  return falta;
}

export function puedeCompartirse(curso: CursoParaCompartir): boolean {
  return faltaParaCompartir(curso).length === 0;
}

/**
 * El mensaje completo para el docente. Se arma aquí y no en la pantalla
 * para que diga lo mismo en la acción del servidor y en el aviso de la
 * interfaz.
 */
export function mensajeDeRequisitos(falta: string[]): string {
  if (falta.length === 0) {
    return "Este curso ya se puede compartir con otros docentes.";
  }

  if (falta.length === 1) {
    return `Para compartirlo te falta ${falta[0]}.`;
  }

  const ultimo = falta[falta.length - 1];
  const previos = falta.slice(0, -1).join(", ");
  return `Para compartirlo te faltan: ${previos} y ${ultimo}.`;
}
