/**
 * US57 — los términos que acepta un docente al compartir un curso
 * (28/11/2026).
 *
 * **Por qué existe este archivo.** Hasta hoy, marcar un curso como
 * compartible era un interruptor sin ninguna advertencia: el curso pasaba a
 * estar disponible para que otros docentes lo copiaran y adaptaran, y
 * **nadie había aceptado nada**. Si un docente se molesta porque adaptaron
 * su material, no hay un momento en el que haya dicho que sí.
 *
 * **Lo que NO se puede hacer, aunque se quiera** (el docente lo preguntó el
 * 27/11): publicar el material "sin derechos de autor". Los derechos
 * morales —que a alguien se le reconozca como autor de lo que hizo— son
 * irrenunciables; no se quitan por una decisión de producto ni porque el
 * material se modifique. Lo que sí se puede pedir es una **licencia**:
 * permiso para usar y adaptar. Por eso el texto de abajo pide permiso y
 * promete crédito, en vez de pedirle al docente que renuncie a algo.
 *
 * **Alcance deliberadamente mínimo.** Se pide solo lo que la plataforma ya
 * hace: que otros docentes **de esta plataforma** copien y adapten el curso.
 * No se pide la cesión más fuerte —que la plataforma meta el curso en su
 * biblioteca propia y lo edite—, que es una decisión comercial, se pide
 * aparte y con otras palabras. Está anotado en US57.
 *
 * **El texto lo tiene que revisar un abogado antes de cobrarle a nadie.**
 * Lo de acá está escrito para que un docente lo entienda, no para que
 * resista un juzgado, y por eso se guarda la **versión**: cuando el texto
 * cambie, se sube la versión y las aceptaciones viejas siguen diciendo qué
 * fue lo que cada quien aceptó.
 */

/**
 * La versión del texto, con la fecha en que se escribió. Se guarda junto a
 * la aceptación: sin esto, "aceptó los términos" no dice **qué** aceptó.
 * **Al cambiar el texto de abajo hay que subir esta versión.**
 */
export const VERSION_LICENCIA = "2026-11-28";

/** El resumen de una línea, el que va junto a la casilla. */
export const RESUMEN_LICENCIA =
  "Autorizo a otros docentes de la plataforma a tomar este curso y adaptarlo para sus grupos.";

/**
 * Los puntos del acuerdo, para mostrarlos desplegados. En lista y no en un
 * párrafo largo: un texto legal que nadie lee no es un consentimiento, es
 * un trámite.
 */
export const PUNTOS_LICENCIA = [
  "Otro docente puede hacer una **copia** de este curso y cambiarla para su grupo. Tu curso no se toca: la copia es suya, con sus estudiantes y sus notas.",
  "**Sigues siendo el autor.** Cada copia muestra que fue adaptada de un curso tuyo, con tu nombre, y eso no se quita.",
  "El permiso es **para docentes de esta plataforma**. No autorizas que tu material se venda aparte ni que se publique fuera.",
  "**Puedes dejar de compartirlo cuando quieras.** Eso impide copias nuevas; las que ya se hicieron siguen siendo el curso de ese otro docente, con el trabajo de sus estudiantes adentro.",
  "Antes de aparecer en el catálogo, el administrador revisa el curso.",
] as const;

/**
 * Si un curso que ya está compartido no tiene aceptación registrada.
 *
 * Pasa con los cursos que se compartieron **antes** de que esta casilla
 * existiera: la migración no inventa una aceptación que nadie dio. Quien
 * revisa el catálogo lo ve y decide; y la próxima vez que el autor toque el
 * interruptor, se le pide.
 */
export function faltaLicencia(curso: {
  compartible: boolean;
  licenciaAceptadaEn: Date | null;
}): boolean {
  return curso.compartible && curso.licenciaAceptadaEn === null;
}

/** Si lo aceptado corresponde al texto vigente. */
export function licenciaAlDia(curso: { licenciaVersion: string | null }): boolean {
  return curso.licenciaVersion === VERSION_LICENCIA;
}
