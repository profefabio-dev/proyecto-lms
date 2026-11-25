/**
 * Las novedades del Estudiante (22/11/2026).
 *
 * Pedido del docente: *"el estudiante también debe ver las noticias, que
 * pueden ser una calificación nueva"*. Hasta ahora, para enterarse de que
 * le calificaron algo había que entrar a "Mis notas" y acordarse de cómo
 * estaba antes.
 *
 * **Una ventana de tiempo, no un estado leído/no leído.** Marcar cosas como
 * vistas obliga a guardar por estudiante qué vio y cuándo, y se equivoca
 * justo cuando más importa: basta con que la página cargue un segundo para
 * que algo quede "leído" sin haberlo visto — exactamente el error que se
 * corrigió en US19, cuando el progreso se marcaba solo por abrir la página.
 * "Lo de las últimas dos semanas" no se equivoca y no necesita ninguna
 * tabla nueva.
 *
 * El orden importa y no es cronológico: primero lo que **vence** y todavía
 * no entregó, porque es lo único sobre lo que el estudiante puede actuar
 * hoy; después las notas; y por último el material nuevo.
 *
 * **US53 (25/11/2026): los anuncios del docente van arriba de todo.** Son
 * la única novedad que **alguien escribió a propósito** — el resto las
 * deduce la plataforma de los datos. Si el docente se tomó el trabajo de
 * decir "mañana traigan la protoboard", eso pesa más que un plazo que el
 * estudiante ya puede ver en su curso.
 *
 * Sin Prisma, igual que `lib/grades.ts` y `lib/route-progress.ts`: recibe
 * datos ya consultados y se prueba sola.
 */

export const DIAS_DE_VENTANA = 14;
export const DIAS_DE_AVISO_DE_PLAZO = 7;

export type Novedad =
  | {
      tipo: "anuncio";
      cursoId: string;
      cursoTitulo: string;
      titulo: string;
      href: string;
      fecha: Date;
      /** El anuncio en Markdown, para mostrarlo completo sin otra consulta. */
      cuerpo: string;
      autor: string;
    }
  | {
      tipo: "plazo";
      cursoId: string;
      cursoTitulo: string;
      titulo: string;
      href: string;
      fecha: Date;
      /** Días que faltan; 0 es hoy, negativo es que ya se pasó. */
      diasRestantes: number;
    }
  | {
      tipo: "nota";
      cursoId: string;
      cursoTitulo: string;
      titulo: string;
      href: string;
      fecha: Date;
      porcentaje: number;
      retroalimentacion: string | null;
    }
  | {
      tipo: "material";
      cursoId: string;
      cursoTitulo: string;
      titulo: string;
      href: string;
      fecha: Date;
      clase: "leccion" | "actividad" | "evaluacion";
    };

/** La fecha que queda `dias` más adelante — el tope del aviso de plazo. */
export function proximosDias(ahora: Date, dias: number): Date {
  const tope = new Date(ahora);
  tope.setDate(tope.getDate() + dias);
  return tope;
}

export function dentroDeLaVentana(fecha: Date, ahora: Date, dias = DIAS_DE_VENTANA): boolean {
  const limite = new Date(ahora);
  limite.setDate(limite.getDate() - dias);
  return fecha >= limite && fecha <= ahora;
}

/**
 * Días completos entre dos fechas, contando solo el día del calendario: si
 * algo vence hoy a las 23:00 y son las 8:00, faltan 0 días ("vence hoy"),
 * no 0.6. Es como lo cuenta una persona.
 */
export function diasHasta(fecha: Date, ahora: Date): number {
  const a = Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const b = Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return Math.round((a - b) / 86_400_000);
}

export function textoDePlazo(diasRestantes: number): string {
  if (diasRestantes < 0) return "Se pasó el plazo";
  if (diasRestantes === 0) return "Vence hoy";
  if (diasRestantes === 1) return "Vence mañana";
  return `Vencen en ${diasRestantes} días`;
}

/**
 * Las novedades ya ordenadas: anuncios del docente primero, después los
 * plazos (el más próximo arriba), y al final notas y material, lo más
 * reciente primero dentro de cada grupo.
 */
export function ordenarNovedades(novedades: Novedad[]): Novedad[] {
  const peso = { anuncio: 0, plazo: 1, nota: 2, material: 3 };

  return [...novedades].sort((a, b) => {
    if (peso[a.tipo] !== peso[b.tipo]) return peso[a.tipo] - peso[b.tipo];
    // Un plazo que vence antes es más urgente; en el resto, lo más nuevo
    // va arriba.
    if (a.tipo === "plazo" && b.tipo === "plazo") {
      return a.fecha.getTime() - b.fecha.getTime();
    }
    return b.fecha.getTime() - a.fecha.getTime();
  });
}
