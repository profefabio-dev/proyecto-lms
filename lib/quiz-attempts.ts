/**
 * OP08 (21/11/2026) — intentos restantes de un estudiante en una evaluación.
 *
 * El docente pidió, al probar una evaluación, que se pudiera "establecer un
 * límite de intentos": sin tope, repetir hasta acertar por eliminación vacía
 * de sentido el resultado.
 *
 * `intentosMaximos` en `null` significa sin límite — así se han comportado
 * todas las evaluaciones hasta hoy, y así siguen las ya creadas. Se
 * representa con `Infinity` para que las pantallas no tengan que distinguir
 * los dos casos en cada comparación, y la función vive aquí, sin Prisma,
 * para poder probarla sola (igual que `calcularProgreso` o
 * `calcularAvanceDeRuta`).
 */
export function intentosRestantes(
  intentosMaximos: number | null,
  intentosUsados: number
): number {
  if (intentosMaximos === null) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, intentosMaximos - intentosUsados);
}

/**
 * Si al estudiante todavía le queda al menos un intento. El bloqueo real
 * vive en la Server Action `responderQuiz`: esta función solo decide si
 * tiene sentido mostrarle el formulario.
 */
export function puedeIntentar(intentosMaximos: number | null, intentosUsados: number): boolean {
  return intentosRestantes(intentosMaximos, intentosUsados) > 0;
}
