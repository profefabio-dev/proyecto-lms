/**
 * US56, capa A — el modo de lectura de una lección (28/11/2026).
 *
 * **La pregunta que resuelve.** El 27/11 el docente vio tres maquetas de la
 * misma lección y eligió las tres combinadas, en orden A → B → C. La capa A
 * —la lección tratada como lectura— venía dibujada sobre papel claro, pero
 * la plataforma es oscura desde OP09 (21/11), y eso es una contradicción que
 * había que resolver antes de escribir una línea de CSS. Preguntado el
 * 28/11, el docente eligió que **decida el estudiante**.
 *
 * **Por qué una cookie y no `localStorage`.** `localStorage` solo existe en
 * el navegador, así que el servidor pinta la lección sin saber qué eligió el
 * estudiante y recién en el navegador corrige: eso es el *parpadeo* clásico
 * —la lección aparece oscura y un instante después se vuelve clara— y, en
 * React, obliga a llamar a `setState` dentro de un `useEffect`, que es un
 * error de eslint que este proyecto ya tropezó cuatro veces
 * (`bulk-import-students-form.tsx` 15/09, `add-question-form.tsx` 19/11,
 * `lesson-player-shell.tsx` 26/11, `announcement-list.tsx` 27/11; está
 * anotado en `AGENTS.md`). Con cookie, el servidor ya sabe el modo cuando
 * arma la página: no hay parpadeo, no hay estado en el cliente, y el
 * interruptor es un `<form>` que funciona incluso sin JavaScript.
 *
 * **Lo que la cookie NO es.** No es preferencia de cuenta: vive en el
 * navegador, así que un estudiante que entre desde el computador del colegio
 * y desde su casa elige en cada uno. Guardarla en `users` sería una columna
 * y una migración por un gusto que se cambia con un clic; si algún día se
 * pide "que me siga a todos lados", se mueve. Queda escrito para no
 * discutirlo dos veces.
 */

/** Los dos modos, y el orden en que se ofrecen. */
export const MODOS_DE_LECTURA = ["oscuro", "claro"] as const;

export type ModoLectura = (typeof MODOS_DE_LECTURA)[number];

/**
 * El modo de la plataforma (OP09) es el que ve quien nunca tocó el
 * interruptor: la lección no cambia de aspecto por sí sola.
 */
export const MODO_LECTURA_POR_OMISION: ModoLectura = "oscuro";

export const COOKIE_MODO_LECTURA = "modo-lectura";

/** Un año: es un gusto, no una sesión. */
export const SEGUNDOS_COOKIE_MODO_LECTURA = 365 * 24 * 60 * 60;

/**
 * Si un valor cualquiera —el de la cookie, el de un formulario— es uno de
 * los modos. Lo que llega de afuera se valida siempre: una cookie la escribe
 * el navegador y puede decir cualquier cosa.
 */
export function esModoLectura(valor: unknown): valor is ModoLectura {
  return typeof valor === "string" && (MODOS_DE_LECTURA as readonly string[]).includes(valor);
}

/**
 * El modo que corresponde a un valor guardado. Cualquier cosa que no sea un
 * modo conocido —ausente, en blanco, basura— cae en el de la plataforma, sin
 * error: una preferencia ilegible no debe romper una lección.
 */
export function leerModoLectura(valor: unknown): ModoLectura {
  return esModoLectura(valor) ? valor : MODO_LECTURA_POR_OMISION;
}

/** El modo al que lleva el interruptor desde el actual. */
export function modoOpuesto(modo: ModoLectura): ModoLectura {
  return modo === "claro" ? "oscuro" : "claro";
}

/**
 * La clase que convierte una superficie en hoja clara (ver
 * `app/globals.css`). En modo oscuro no se agrega ninguna clase: la lección
 * hereda los tokens de la plataforma, que es exactamente lo que tiene que
 * pasar.
 */
export function claseDeLaHoja(modo: ModoLectura): string | undefined {
  return modo === "claro" ? "hoja-clara" : undefined;
}
