"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { renombrarSeccion } from "@/lib/actions/rename-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const estadoInicial = null;

// Renombrar está plegado por defecto (19/11/2026). Antes el campo con el
// nombre de la sección estaba siempre abierto justo debajo del título, y
// parecía que la pantalla pedía bautizar otra vez una sección ya creada —
// el docente lo reportó como un bucle sin sentido. Mismo patrón que
// `EditEmailForm`: primero un botón, el campo solo cuando se va a usar.
export function RenameSectionForm({
  seccionId,
  tituloActual,
}: {
  seccionId: string;
  tituloActual: string;
}) {
  const [estado, accion, enviando] = useActionState(renombrarSeccion, estadoInicial);
  const [editando, setEditando] = useState(false);

  const [estadoYaVisto, setEstadoYaVisto] = useState(estado);
  if (estado !== estadoYaVisto) {
    setEstadoYaVisto(estado);
    if (estado?.success) {
      setEditando(false);
    }
  }

  if (!editando) {
    return (
      <Button type="button" variant="outline" size="xs" onClick={() => setEditando(true)}>
        <Pencil className="size-3" aria-hidden="true" />
        Renombrar
      </Button>
    );
  }

  return (
    <form action={accion} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="seccionId" value={seccionId} />
      <Input
        name="titulo"
        defaultValue={tituloActual}
        aria-label="Nuevo título de la sección"
        className="h-8 max-w-56 text-sm font-semibold"
        required
        autoFocus
      />
      <Button type="submit" size="xs" disabled={enviando}>
        {enviando ? "Guardando..." : "Guardar"}
      </Button>
      <Button type="button" variant="outline" size="xs" onClick={() => setEditando(false)}>
        Cancelar
      </Button>
      {estado && !estado.success && (
        <p role="alert" className="w-full text-xs text-destructive">
          {estado.error}
        </p>
      )}
    </form>
  );
}
