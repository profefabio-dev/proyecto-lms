"use client";

import { useActionState } from "react";
import { moverContenido } from "@/lib/actions/reorder-content";
import { alternarVisibilidadContenido } from "@/lib/actions/toggle-content-visibility";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ContentOrderControls({
  contentId,
  esPrimero,
  esUltimo,
  visible,
}: {
  contentId: string;
  esPrimero: boolean;
  esUltimo: boolean;
  visible: boolean;
}) {
  const [, moverAction, moviendo] = useActionState(moverContenido, null);
  const [, alternarAction, alternando] = useActionState(alternarVisibilidadContenido, null);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <form action={moverAction}>
        <input type="hidden" name="contentId" value={contentId} />
        <input type="hidden" name="direccion" value="arriba" />
        <Button
          type="submit"
          variant="outline"
          size="icon-xs"
          disabled={esPrimero || moviendo}
          aria-label="Mover contenido arriba"
        >
          ↑
        </Button>
      </form>

      <form action={moverAction}>
        <input type="hidden" name="contentId" value={contentId} />
        <input type="hidden" name="direccion" value="abajo" />
        <Button
          type="submit"
          variant="outline"
          size="icon-xs"
          disabled={esUltimo || moviendo}
          aria-label="Mover contenido abajo"
        >
          ↓
        </Button>
      </form>

      <form action={alternarAction}>
        <input type="hidden" name="contentId" value={contentId} />
        <Button type="submit" variant="outline" size="xs" disabled={alternando}>
          {visible ? "Ocultar" : "Mostrar"}
        </Button>
      </form>

      {!visible && <Badge variant="secondary">Oculto</Badge>}
    </div>
  );
}
