"use client";

import { useActionState, useState } from "react";
import { CalendarClock, Check } from "lucide-react";
import { editarVentanaDeActividad } from "@/lib/actions/edit-activity-window";
import { valorParaCampoDeFecha } from "@/lib/activity-submission";
import { Button } from "@/components/ui/button";

/**
 * Cambiar las dos fechas de una actividad ya creada (26/11/2026).
 *
 * **Empieza cerrado**, detrás de un botón, como manda OP07: lo que se
 * consulta está a la vista y lo que se edita está detrás de un botón. En
 * esta pantalla lo que el tutor viene a hacer es calificar; mover el plazo
 * es la excepción, no lo primero.
 *
 * Los dos campos se pueden **dejar en blanco** para quitar la fecha. Se dice
 * en pantalla, porque un campo vacío que borra un dato no es evidente.
 */
export function EditActivityWindowForm({
  actividadId,
  fechaLimite,
  fechaCierre,
}: {
  actividadId: string;
  fechaLimite: Date | null;
  fechaCierre: Date | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, enviando] = useActionState(editarVentanaDeActividad, null);

  if (!abierto) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAbierto(true)}
        className="min-h-11 gap-2 font-semibold"
      >
        <CalendarClock className="size-4" aria-hidden="true" />
        Cambiar las fechas
      </Button>
    );
  }

  return (
    <form
      action={accion}
      className="w-full space-y-4 rounded-2xl border border-border/80 bg-card p-5"
    >
      <input type="hidden" name="actividadId" value={actividadId} />

      <div className="space-y-1">
        <h3 className="font-heading text-base font-bold text-foreground">Fechas de la actividad</h3>
        <p className="text-xs text-muted-foreground">
          Deja un campo en blanco para quitar esa fecha. Pasado el <strong>vencimiento</strong> la
          entrega se marca fuera de plazo pero se acepta; pasado el <strong>cierre</strong> ya no se
          puede entregar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="font-semibold text-foreground">Vencimiento</span>
          <input
            type="datetime-local"
            name="fechaLimite"
            defaultValue={valorParaCampoDeFecha(fechaLimite)}
            className="h-11 w-full rounded-2xl border border-border/80 bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-semibold text-foreground">Cierre (opcional)</span>
          <input
            type="datetime-local"
            name="fechaCierre"
            defaultValue={valorParaCampoDeFecha(fechaCierre)}
            className="h-11 w-full rounded-2xl border border-border/80 bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
      </div>

      {estado && !estado.success && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {estado.error}
        </p>
      )}

      {estado?.success && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-500">
          <Check className="size-4" aria-hidden="true" />
          Fechas guardadas.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={enviando} className="min-h-11 font-semibold">
          {enviando ? "Guardando..." : "Guardar fechas"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAbierto(false)}
          className="min-h-11 font-semibold"
        >
          Cerrar
        </Button>
      </div>
    </form>
  );
}
