/**
 * US52 — la ventana de entrega de una actividad y qué se exige entregar
 * (25/11/2026).
 *
 * Las dos ideas salen de revisar la plataforma del colegio del docente
 * (Chamilo), que en el formulario de una tarea ofrece **dos fechas
 * distintas** —vencimiento y finalización— y **el tipo de documento
 * aceptado**. Eran las dos decisiones que aquí estaban tomadas por el
 * código y no por el docente.
 *
 * **Las dos fechas no son lo mismo y conviene no confundirlas:**
 *
 *   · `fechaLimite` (vencimiento) ya existía: pasada esa fecha la entrega
 *     se marca **fuera de plazo**, pero se acepta. Esa decisión del
 *     19/11/2026 sigue en pie — bloquear por defecto deja al estudiante sin
 *     ninguna forma de presentar, y es el docente quien decide qué hacer
 *     con un trabajo tardío.
 *   · `fechaCierre` (finalización) es nueva y **sí cierra**. Es opcional, y
 *     mientras esté vacía la actividad se comporta exactamente como hasta
 *     hoy: nunca se bloquea. Sirve para el caso real que faltaba —"el
 *     viernes a las 11 cierro y califico"— sin convertirlo en la regla.
 *
 * Sin Prisma, como el resto de `lib/`, para poder probarla sola. El tipo de
 * entrega se escribe como unión de cadenas y no importando el enum de
 * Prisma por el mismo motivo (y porque en el entorno de nube ese enum no
 * existe hasta generar el cliente).
 */

/** Espejo del enum `TipoEntrega` de Prisma. */
export type TipoEntrega = "AMBOS" | "SOLO_TEXTO" | "SOLO_ARCHIVO";

export type VentanaDeEntrega = {
  fechaLimite: Date | null;
  fechaCierre: Date | null;
};

export type EstadoDeEntrega = "abierta" | "fuera_de_plazo" | "cerrada";

/**
 * En qué momento de su ventana está la actividad. `cerrada` manda sobre
 * `fuera_de_plazo`: si las dos fechas ya pasaron, lo que importa es que no
 * se puede entregar.
 */
export function estadoDeLaEntrega(ventana: VentanaDeEntrega, ahora: Date): EstadoDeEntrega {
  if (ventana.fechaCierre && ahora.getTime() > ventana.fechaCierre.getTime()) {
    return "cerrada";
  }

  if (ventana.fechaLimite && ahora.getTime() > ventana.fechaLimite.getTime()) {
    return "fuera_de_plazo";
  }

  return "abierta";
}

export function entregaCerrada(ventana: VentanaDeEntrega, ahora: Date): boolean {
  return estadoDeLaEntrega(ventana, ahora) === "cerrada";
}

/**
 * Comprueba que una fecha de cierre sea posterior al vencimiento. Un cierre
 * anterior al plazo dejaría una actividad en la que entregar a tiempo ya es
 * imposible — se rechaza al crearla, no después.
 */
export function cierreCoherente(ventana: VentanaDeEntrega): boolean {
  if (!ventana.fechaCierre || !ventana.fechaLimite) {
    return true;
  }

  return ventana.fechaCierre.getTime() >= ventana.fechaLimite.getTime();
}

/**
 * Qué le falta a la entrega según lo que el docente exige. Devuelve el
 * mensaje para el estudiante, o `null` si está bien — mismo criterio que
 * `faltaParaCompartir` en US49: la frase se arma aquí y no en la pantalla,
 * para que diga lo mismo en la acción del servidor y en el formulario.
 *
 * Se mira **cómo queda la entrega**, no solo lo que llegó en este envío:
 * corregir el texto de una entrega que ya tenía archivo es válido.
 */
export function faltaParaEntregar(
  tipo: TipoEntrega,
  entrega: { tendraTexto: boolean; tendraArchivo: boolean }
): string | null {
  if (tipo === "SOLO_TEXTO" && !entrega.tendraTexto) {
    return "Esta actividad se entrega escribiendo tu respuesta.";
  }

  if (tipo === "SOLO_ARCHIVO" && !entrega.tendraArchivo) {
    return "Esta actividad se entrega adjuntando un archivo.";
  }

  if (tipo === "AMBOS" && !entrega.tendraTexto && !entrega.tendraArchivo) {
    return "Escribe tu respuesta o adjunta un archivo.";
  }

  return null;
}

/** Lo que se le dice al estudiante antes de entregar. */
export function textoDeLoQueSeEspera(tipo: TipoEntrega): string {
  switch (tipo) {
    case "SOLO_TEXTO":
      return "Escribe tu respuesta aquí.";
    case "SOLO_ARCHIVO":
      return "Adjunta tu archivo.";
    default:
      return "Puedes escribir tu respuesta, adjuntar un archivo, o las dos cosas.";
  }
}

/**
 * La fecha como la espera un campo `datetime-local`: `YYYY-MM-DDTHH:mm` en
 * **hora local**, o cadena vacía si no hay fecha.
 *
 * No sirve `toISOString().slice(0, 16)`, que es la clásica: devuelve UTC, y
 * en Colombia (UTC-5) el campo aparecería con cinco horas de más — un plazo
 * de las 11 de la noche se vería como las 4 de la mañana del día siguiente.
 * Se agrega para poder editar las dos fechas de una actividad ya creada
 * (26/11/2026) mostrando lo que el docente escribió, no otra hora.
 */
export function valorParaCampoDeFecha(fecha: Date | null): string {
  if (!fecha) {
    return "";
  }

  const dos = (n: number) => String(n).padStart(2, "0");

  return (
    `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}` +
    `T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`
  );
}
