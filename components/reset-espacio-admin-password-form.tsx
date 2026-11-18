"use client";

import { useActionState, useState } from "react";
import { restablecerPasswordAdministradorEspacio } from "@/lib/actions/reset-espacio-admin-password";
import { Button } from "@/components/ui/button";

type EstadoAccion =
  | { success: true; passwordTemporal: string }
  | { success: false; error: string }
  | null;

async function accionInicial(_prevState: EstadoAccion, formData: FormData) {
  return restablecerPasswordAdministradorEspacio(formData);
}

/**
 * OP03 — mismo patrón de "mostrar una sola vez" que `ResetPasswordForm`
 * (OP01), pero desde `/superadmin`: le da al Super Administrador una forma
 * de restablecer la contraseña del Administrador principal de un espacio
 * sin depender de un script de terminal (ver `restablecerPasswordAdministradorEspacio`
 * para el porqué de este vacío).
 */
export function ResetEspacioAdminPasswordForm({ administradorId }: { administradorId: string }) {
  const [estado, formAction, isPending] = useActionState(accionInicial, null);
  const [visible, setVisible] = useState(true);

  const [ultimoEstadoVisto, setUltimoEstadoVisto] = useState(estado);
  if (estado !== ultimoEstadoVisto) {
    setUltimoEstadoVisto(estado);
    setVisible(true);
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <form action={formAction} className="inline-flex items-center gap-2">
        <input type="hidden" name="usuarioId" value={administradorId} />
        <Button type="submit" variant="outline" size="xs" disabled={isPending}>
          {isPending ? "Restableciendo..." : "Restablecer contraseña"}
        </Button>
      </form>

      {estado && !estado.success && visible && (
        <p className="text-xs text-destructive" role="alert">
          {estado.error}
        </p>
      )}

      {estado && estado.success && visible && (
        <div className="rounded border border-success-border bg-success-soft p-2 text-xs">
          <p className="font-medium text-success">Nueva contraseña temporal:</p>
          <p>
            <code>{estado.passwordTemporal}</code>
          </p>
          <p className="mt-1 text-success">
            Compártela con el Administrador de forma segura; debería cambiarla en su próximo
            inicio de sesión.
          </p>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="mt-1 text-success underline"
          >
            Ocultar
          </button>
        </div>
      )}
    </div>
  );
}
