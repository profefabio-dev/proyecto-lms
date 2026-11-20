/**
 * US46 — notas del Estudiante, en una escala comparable.
 *
 * La plataforma guarda dos clases de calificación que no se pueden sumar
 * tal cual: una actividad trae `nota` sobre un `puntajeMaximo` que el Tutor
 * define por actividad (100, 50, 20...), y un quiz trae `puntaje` ya en
 * porcentaje. Para mostrar un promedio que signifique algo, todo se
 * normaliza a porcentaje antes de promediar.
 *
 * Sin Prisma, igual que `calcularProgreso` y `calcularAvanceDeRuta`, así se
 * prueba solo.
 */
export function porcentajeDeNota(nota: number, puntajeMaximo: number): number {
  if (puntajeMaximo <= 0) {
    return 0;
  }

  const porcentaje = (nota / puntajeMaximo) * 100;
  return Math.round(Math.min(100, Math.max(0, porcentaje)));
}

/**
 * Promedio de los porcentajes ya normalizados. Sin calificaciones devuelve
 * `null` y no 0: "todavía no tienes notas" y "tienes cero" son cosas muy
 * distintas para un estudiante, y mostrar un 0% donde no hay nada
 * calificado sería una mala noticia inventada.
 */
export function promediarPorcentajes(porcentajes: number[]): number | null {
  if (porcentajes.length === 0) {
    return null;
  }

  const suma = porcentajes.reduce((total, valor) => total + valor, 0);
  return Math.round(suma / porcentajes.length);
}

/**
 * Escala colombiana 1.0 – 5.0, que es la que leen el docente y la familia.
 * Se deja con un decimal, como en los boletines.
 */
export function notaSobreCinco(porcentaje: number): string {
  return ((porcentaje / 100) * 5).toFixed(1);
}
