"use client";

import { useActionState, useState } from "react";
import { resetearPasswordUsuario } from "@/lib/actions/reset-user-password";
import { Button } from "@/components/ui/button";

type EstadoAccion =
  | { success: true; passwordTemporal: string }
  | { success: false; error: string }
  | null;

async function accionInicial(_prevState: EstadoAccion, formData: FormData) {
  return resetearPasswordUsuario(formData);
}

/**
 * Un usuario (sobre todo un Estudiante, en su mayoría niños) que olvidó su
 * contraseña no tiene forma de "verla" — nunca se guarda en texto plano, ni
 * aquí ni en Supabase Auth — así que este botón genera una nueva y la
 * muestra una sola vez en pantalla, igual que ya pasa al crear una cuenta
 * (US02/US06), para que el Administrador/Tutor se la pueda dar de forma
 * segura y el usuario la cambie en su próximo ingreso.
 */
export function ResetPasswordForm({ usuarioId }: { usuarioId: string }) {
  const [estado, formAction, isPending] = useActionState(accionInicial, null);
  const [visible, setVisible] = useState(true);

  // Si se dispara una nueva acción con éxito, vuelve a mostrarse aunque se
  // hubiera ocultado el resultado anterior — mismo patrón de comparación
  // durante el render (no en un efecto) que EditEmailForm/EditUserNameForm.
  const [ultimoEstadoVisto, setUltimoEstadoVisto] = useState(estado);
  if (estado !== ultimoEstadoVisto) {
    setUltimoEstadoVisto(estado);
    setVisible(true);
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <form action={formAction} className="inline-flex items-center gap-2">
        <input type="hidden" name="usuarioId" value={usuarioId} />
        <Button type="submit" variant="outline" size="xs" disabled={isPending}>
          {isPending ? "Restableciendo..." : "Restablecer contraseña"}
        </Button>
      </form>

      {estado && !estado.success && visible && (
        <p className="text-xs text-red-600" role="alert">
          {estado.error}
        </p>
      )}

      {estado && estado.success && visible && (
        <div className="rounded border border-green-200 bg-green-50 p-2 text-xs">
          <p className="font-medium text-green-800">Nueva contraseña temporal:</p>
          <p>
            <code>{estado.passwordTemporal}</code>
          </p>
          <p className="mt-1 text-green-700">
            Compártela con el usuario de forma segura; debería cambiarla en su próximo inicio de sesión.
          </p>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="mt-1 text-green-700 underline"
          >
            Ocultar
          </button>
        </div>
      )}
    </div>
  );
}
