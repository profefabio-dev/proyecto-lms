/**
 * Racha de días consecutivos con actividad, para el panel del Estudiante.
 *
 * Se calcula a partir de `ContentViews.vistoEn` (marcado automáticamente al
 * abrir un contenido, ver `lib/progress-tracking.ts`): no requiere ninguna
 * tabla ni columna nueva. La función es pura — solo trabaja con las fechas
 * ya resueltas por la consulta a Prisma — para poder probarla de forma
 * aislada, igual que `calcularProgreso` en `lib/course-progress.ts`.
 *
 * Regla: cuenta días consecutivos con al menos una vista, terminando hoy.
 * Se da un día de gracia: si hoy todavía no hay actividad pero ayer sí la
 * hubo, la racha sigue viva (no se rompe hasta que pasa un día entero sin
 * ninguna vista). Si ni hoy ni ayer hay actividad, la racha es 0.
 */
export function calcularRacha(fechas: Date[], ahora: Date = new Date()): number {
  if (fechas.length === 0) {
    return 0;
  }

  const dias = new Set(fechas.map(claveDia));

  const cursor = new Date(ahora);
  cursor.setHours(0, 0, 0, 0);

  if (!dias.has(claveDia(cursor))) {
    // No hay actividad hoy: solo seguimos si la hubo ayer (día de gracia).
    cursor.setDate(cursor.getDate() - 1);
    if (!dias.has(claveDia(cursor))) {
      return 0;
    }
  }

  let racha = 0;
  while (dias.has(claveDia(cursor))) {
    racha += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return racha;
}

function claveDia(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
