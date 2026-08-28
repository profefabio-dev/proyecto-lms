"use client";

import { useActionState, useEffect, useState } from "react";
import { actualizarEmailUsuario } from "@/lib/actions/update-user-email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EstadoAccion =
  | { success: true }
  | { success: false; error: string }
  | null;

async function accionInicial(_prevState: EstadoAccion, formData: FormData) {
  return actualizarEmailUsuario(formData);
}

export function EditEmailForm({
  usuarioId,
  emailActual,
}: {
  usuarioId: string;
  emailActual: string;
}) {
  const [editando, setEditando] = useState(false);
  const [estado, formAction, isPending] = useActionState(accionInicial, null);

  // Al guardar con éxito, volvemos a modo lectura: revalidatePath ya trajo
  // el email nuevo al Server Component padre.
  useEffect(() => {
    if (estado?.success) {
      setEditando(false);
    }
  }, [estado]);

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="text-xs text-blue-600 underline"
      >
        Editar email
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <Input
        name="nuevoEmail"
        type="email"
        defaultValue={emailActual}
        required
        className="h-8 w-56 text-xs"
      />
      <Button type="submit" size="xs" disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar"}
      </Button>
      <button
        type="button"
        onClick={() => setEditando(false)}
        className="text-xs text-gray-500 underline"
      >
        Cancelar
      </button>
      {estado && !estado.success && (
        <p className="w-full text-xs text-red-600" role="alert">
          {estado.error}
        </p>
      )}
    </form>
  );
}
