"use client";

import { useActionState, useState } from "react";
import { actualizarNombreUsuario } from "@/lib/actions/update-user-name";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EstadoAccion =
  | { success: true }
  | { success: false; error: string }
  | null;

async function accionInicial(_prevState: EstadoAccion, formData: FormData) {
  return actualizarNombreUsuario(formData);
}

export function EditUserNameForm({
  usuarioId,
  nombreActual,
  apellidoActual,
}: {
  usuarioId: string;
  nombreActual: string;
  apellidoActual: string;
}) {
  const [editando, setEditando] = useState(false);
  const [estado, formAction, isPending] = useActionState(accionInicial, null);

  // Mismo patrón que EditEmailForm: se vuelve a modo lectura al guardar con
  // éxito, comparando contra el último estado visto durante el render (no
  // en un efecto), para evitar el renderizado en cascada que React
  // desaconseja con setState síncrono dentro de useEffect.
  const [ultimoEstadoVisto, setUltimoEstadoVisto] = useState(estado);
  if (estado !== ultimoEstadoVisto) {
    setUltimoEstadoVisto(estado);
    if (estado?.success) {
      setEditando(false);
    }
  }

  if (!editando) {
    return (
      <Button type="button" variant="outline" size="xs" onClick={() => setEditando(true)}>
        Editar datos
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <Input
        name="nombre"
        type="text"
        defaultValue={nombreActual}
        required
        placeholder="Nombre"
        className="h-8 w-32 text-xs"
      />
      <Input
        name="apellido"
        type="text"
        defaultValue={apellidoActual}
        required
        placeholder="Apellido"
        className="h-8 w-32 text-xs"
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
