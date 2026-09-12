"use client";

import { useActionState } from "react";
import { moverSeccion } from "@/lib/actions/reorder-section";
import { alternarEstadoSeccion } from "@/lib/actions/toggle-section-status";
import { marcarSeccionActual } from "@/lib/actions/mark-current-section";
import { eliminarSeccion } from "@/lib/actions/delete-section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * US30: controles del Tutor sobre una sección — mismo criterio de
 * "botones en vez de drag&drop" que `ContentOrderControls` (US12), más las
 * dos acciones propias de una sección: alternar Disponible/No disponible y
 * marcar/desmarcar la semana actual.
 */
export function SectionControls({
  seccionId,
  esPrimera,
  esUltima,
  estado,
  esActual,
}: {
  seccionId: string;
  esPrimera: boolean;
  esUltima: boolean;
  estado: "DISPONIBLE" | "NO_DISPONIBLE";
  esActual: boolean;
}) {
  const [, moverAction, moviendo] = useActionState(moverSeccion, null);
  const [, alternarAction, alternando] = useActionState(alternarEstadoSeccion, null);
  const [, marcarAction, marcando] = useActionState(marcarSeccionActual, null);
  const [, eliminarAction, eliminando] = useActionState(eliminarSeccion, null);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <form action={moverAction}>
        <input type="hidden" name="seccionId" value={seccionId} />
        <input type="hidden" name="direccion" value="arriba" />
        <Button
          type="submit"
          variant="outline"
          size="icon-xs"
          disabled={esPrimera || moviendo}
          aria-label="Mover sección arriba"
        >
          ↑
        </Button>
      </form>

      <form action={moverAction}>
        <input type="hidden" name="seccionId" value={seccionId} />
        <input type="hidden" name="direccion" value="abajo" />
        <Button
          type="submit"
          variant="outline"
          size="icon-xs"
          disabled={esUltima || moviendo}
          aria-label="Mover sección abajo"
        >
          ↓
        </Button>
      </form>

      <form action={alternarAction}>
        <input type="hidden" name="seccionId" value={seccionId} />
        <Button type="submit" variant="outline" size="xs" disabled={alternando}>
          {estado === "DISPONIBLE" ? "Marcar no disponible" : "Marcar disponible"}
        </Button>
      </form>

      <form action={marcarAction}>
        <input type="hidden" name="seccionId" value={seccionId} />
        <Button type="submit" variant="outline" size="xs" disabled={marcando}>
          {esActual ? "Quitar semana actual" : "Marcar semana actual"}
        </Button>
      </form>

      <form action={eliminarAction}>
        <input type="hidden" name="seccionId" value={seccionId} />
        <Button type="submit" variant="destructive" size="xs" disabled={eliminando}>
          Eliminar sección
        </Button>
      </form>

      {estado === "NO_DISPONIBLE" && <Badge variant="secondary">No disponible</Badge>}
      {esActual && <Badge variant="success">Semana actual</Badge>}
    </div>
  );
}
