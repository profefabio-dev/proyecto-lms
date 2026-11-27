/**
 * US54 — el glosario del curso (27/11/2026).
 *
 * Sin Prisma, como `lib/grades.ts`, `lib/novedades.ts` y
 * `lib/activity-submission.ts`: recibe los términos ya consultados y se
 * prueba sola.
 *
 * Las dos reglas que viven acá y no en la pantalla ni en la acción:
 *
 *   · **Cuándo dos términos son el mismo.** "Algoritmo", "algoritmo" y
 *     "ALGORITMO" son la misma palabra, y "Protoboard" no se vuelve otra
 *     cosa por escribirse con mayúscula. La comparación ignora mayúsculas y
 *     **también acentos**, porque en una lista escrita por un docente de
 *     colegio conviven "Código" y "Codigo" y guardar las dos sería un error
 *     visible para el estudiante. Es el mismo criterio de deduplicación que
 *     usa la carga masiva de estudiantes (US29) con los nombres.
 *   · **Cómo se ordena.** Alfabético, con las reglas del español (`localeCompare`
 *     con `es`), y agrupado por letra inicial. Sin columna `orden` en la
 *     tabla: un glosario se consulta, no se recorre.
 */

export type TerminoDelGlosario = {
  id: string;
  termino: string;
  definicion: string;
};

/**
 * El término reducido a lo que importa para compararlo: sin mayúsculas, sin
 * acentos y sin espacios de sobra. **No es lo que se guarda** — se guarda lo
 * que el docente escribió, con sus acentos.
 */
export function normalizarTermino(termino: string): string {
  return (
    termino
      .trim()
      .toLowerCase()
      // La **ñ se protege** antes de quitar acentos: descomponer y borrar las
      // marcas la convertiría en "n", y en español eso cambia la palabra —
      // el ejemplo de siempre es "año" contra "ano", y en esta materia está
      // "diseño". La diéresis sí se quita: "pingüino" y "pinguino" son la
      // misma palabra mal escrita, porque la ü no es una letra aparte.
      //
      // Primero a NFC, para que la ñ sea un solo carácter y no una "n" con
      // una tilde suelta: el texto puede llegar de las dos formas según el
      // teclado o el sistema de quien lo escribió.
      .normalize("NFC")
      .replace(/ñ/g, "\u0001")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\u0001/g, "ñ")
  );
}

/** Si el término ya está en el glosario del curso, sin importar cómo se escribió. */
export function terminoRepetido(termino: string, existentes: string[]): boolean {
  const buscado = normalizarTermino(termino);

  return existentes.some((e) => normalizarTermino(e) === buscado);
}

/** Los términos en orden alfabético español. */
export function ordenarTerminos<T extends { termino: string }>(terminos: T[]): T[] {
  return [...terminos].sort((a, b) => a.termino.localeCompare(b.termino, "es"));
}

export type GrupoDeTerminos<T> = { letra: string; terminos: T[] };

/**
 * Los términos agrupados por su letra inicial, ya ordenados — que es cómo se
 * lee un glosario y lo que permite saltar a una letra en vez de recorrer una
 * lista larga.
 *
 * La letra sale del término **sin acento** ("Árbol" va en la A) y en
 * mayúscula. Un término que empiece por un número o un signo cae en "#",
 * para que "3D" no abra un grupo propio por cada dígito.
 */
export function agruparPorLetra<T extends { termino: string }>(
  terminos: T[]
): GrupoDeTerminos<T>[] {
  const grupos = new Map<string, T[]>();

  for (const termino of ordenarTerminos(terminos)) {
    const inicial = normalizarTermino(termino.termino).charAt(0).toUpperCase();
    // La Ñ es una letra del abecedario español y tiene su propio grupo.
    const letra = /[A-Z\u00d1]/.test(inicial) ? inicial : "#";

    const actual = grupos.get(letra);

    if (actual) {
      actual.push(termino);
    } else {
      grupos.set(letra, [termino]);
    }
  }

  return [...grupos.entries()]
    .map(([letra, terminos]) => ({ letra, terminos }))
    .sort((a, b) => {
      // El grupo "#" va al final: los números no son una letra del índice.
      if (a.letra === "#") return 1;
      if (b.letra === "#") return -1;
      return a.letra.localeCompare(b.letra, "es");
    });
}
