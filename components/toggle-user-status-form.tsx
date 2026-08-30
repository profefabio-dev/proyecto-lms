"use client";

import { useActionState } from "react";
import { alternarEstadoUsuario } from "@/lib/actions/toggle-user-status";
import { Button } from "@/components/ui/button";

type EstadoAccion = { success: true } | { success: false; error: string } | null;

async function accionInicial(_prevState: EstadoAccion, formData: FormData) {
  return alternarEstadoUsuario(formData);
}

export function ToggleUserStatusForm({
  usuarioId,
  estadoActual,
}: {
  usuarioId: string;
  estadoActual: "ACTIVO" | "INACTIVO";
}) {
  const [estado, formAction, isPending] = useActionState(accionInicial, null);
  const accion = estadoActual === "ACTIVO" ? "desactivar" : "reactivar";

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="usuarioId" value={usuarioId} />
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
