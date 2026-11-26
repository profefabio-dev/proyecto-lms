/**
 * Las novedades del Estudiante (22/11/2026), y lo que queda de ellas
 * después del rediseño del 25/11.
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
 * tabla nueva. **Esa parte sigue en pie** y es lo que queda en este archivo.
 *
 * **Lo que se retiró el 26/11/2026, por decisión del docente.** Este módulo
 * tenía además el tipo `Novedad` y `ordenarNovedades`, que ponían todas las
 * novedades en **una sola lista ordenada**: primero los anuncios del
 * docente (US53, por ser la única que escribió una persona), después los
 * plazos, las notas y el material. El rediseño del 25/11 reemplazó esa
 * lista por tres bloques separados en la agenda del estudiante
 * (`components/student-sidebar-todo.tsx`: "Por hacer", "Avisos del docente"
 * y "Notas recientes"), con lo cual `components/news-feed.tsx` dejó de
 * importarse y el orden ya no se aplicaba en ninguna pantalla. Se eligió
 * cerrar ese capítulo en vez de mantener dos implementaciones: el código
 * muerto se borró y la decisión de US53 se reescribió para describir lo que
 * la plataforma hace hoy. **Si algún día vuelve la lista única**, el orden
 * que estaba decidido —el anuncio arriba del plazo— está documentado en la
 * fila de US53 del `Backlog.md`.
 *
 * Sin Prisma, igual que `lib/grades.ts` y `lib/route-progress.ts`: recibe
 * datos ya consultados y se prueba sola.
 */

export const DIAS_DE_VENTANA = 14;

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
