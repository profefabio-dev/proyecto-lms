"use client";

import { useActionState } from "react";
import { alternarEstadoEspacio } from "@/lib/actions/toggle-espacio-status";
import { Button } from "@/components/ui/button";

type EstadoAccion = { success: true } | { success: false; error: string } | null;

async function accionInicial(_prevState: EstadoAccion, formData: FormData) {
  return alternarEstadoEspacio(formData);
}

/**
 * US28 — mismo patrón que `ToggleUserStatusForm` (US20), un nivel más
 * arriba: en vez de un usuario, desactiva/reactiva un Espacio completo (y,
 * por dentro, a todos sus Administradores/Tutores a la vez).
 */
export function ToggleEspacioStatusForm({
  espacioId,
  estadoActual,
}: {
  espacioId: string;
  estadoActual: "ACTIVO" | "INACTIVO";
}) {
  const [estado, formAction, isPending] = useActionState(accionInicial, null);
  const accion = estadoActual === "ACTIVO" ? "desactivar" : "reactivar";

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="espacioId" value={espacioId} />
      <input type="hidden" name="accion" value={accion} />
      <Button
        type="submit"
        size="xs"
        variant={estadoActual === "ACTIVO" ? "destructive" : "outline"}
        disabled={isPending}
      >
        {isPending
          ? "Guardando..."
          : estadoActual === "ACTIVO"
            ? "Desactivar"
            : "Reactivar"}
      </Button>
      {estado && !estado.success && (
        <span className="text-xs text-red-600" role="alert">
          {estado.error}
        </span>
      )}
    </form>
  );
}
