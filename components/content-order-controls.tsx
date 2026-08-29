"use client";

import { useActionState } from "react";
import { moverContenido } from "@/lib/actions/reorder-content";
import { alternarVisibilidadContenido } from "@/lib/actions/toggle-content-visibility";

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
        <button
          type="submit"
          disabled={esPrimero || moviendo}
          aria-label="Mover contenido arriba"
          className="rounded border px-1.5 py-0.5 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ↑
        </button>
      </form>

      <form action={moverAction}>
        <input type="hidden" name="contentId" value={contentId} />
        <input type="hidden" name="direccion" value="abajo" />
        <button
          type="submit"
          disabled={esUltimo || moviendo}
          aria-label="Mover contenido abajo"
          className="rounded border px-1.5 py-0.5 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ↓
        </button>
      </form>

      <form action={alternarAction}>
        <input type="hidden" name="contentId" value={contentId} />
        <button
          type="submit"
          disabled={alternando}
          className="rounded border px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </form>

      {!visible && (
        <span className="rounded-full bg-gray-200 px-2 py-0.5 font-medium text-gray-700">
          Oculto
        </span>
      )}
    </div>
  );
}
