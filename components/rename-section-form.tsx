"use client";

import { useActionState } from "react";
import { renombrarSeccion } from "@/lib/actions/rename-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const estadoInicial = null;

export function RenameSectionForm({
  seccionId,
  tituloActual,
}: {
  seccionId: string;
  tituloActual: string;
}) {
  const [estado, accion, enviando] = useActionState(renombrarSeccion, estadoInicial);

  return (
    <form action={accion} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="seccionId" value={seccionId} />
      <Input
        name="titulo"
        defaultValue={tituloActual}
        aria-label="Título de la sección"
        className="h-8 max-w-56 text-sm font-semibold"
        required
      />
      <Button type="submit" variant="outline" size="xs" disabled={enviando}>
        Guardar
      </Button>
      {estado && !estado.success && (
        <p role="alert" className="w-full text-xs text-red-600">
          {estado.error}
        </p>
      )}
    </form>
  );
}
