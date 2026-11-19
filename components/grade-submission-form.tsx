"use client";

import { useActionState, useState } from "react";
import { calificarEntrega } from "@/lib/actions/grade-submission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const estadoInicial = null;

// Formulario de calificación, en línea dentro de la lista de entregas: el
// tutor califica varias seguidas, así que abrir y cerrar una ventana por
// cada estudiante haría el trabajo más lento, no más cómodo. Es la
// excepción deliberada al patrón de diálogo del resto de formularios.
export function GradeSubmissionForm({
  entregaId,
  puntajeMaximo,
  notaPrevia,
  retroalimentacionPrevia,
}: {
  entregaId: string;
  puntajeMaximo: number;
  notaPrevia?: number | null;
  retroalimentacionPrevia?: string | null;
}) {
  const [estado, accion, enviando] = useActionState(calificarEntrega, estadoInicial);
  const [guardado, setGuardado] = useState(false);

  const [estadoYaVisto, setEstadoYaVisto] = useState(estado);
  if (estado !== estadoYaVisto) {
    setEstadoYaVisto(estado);
    setGuardado(Boolean(estado?.success));
  }

  return (
    <form action={accion} className="space-y-3">
      <input type="hidden" name="entregaId" value={entregaId} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`nota-${entregaId}`}>Nota</Label>
          <div className="flex items-center gap-2">
            <Input
              id={`nota-${entregaId}`}
              name="nota"
              type="number"
              step="0.1"
              min={0}
              max={puntajeMaximo}
              defaultValue={notaPrevia ?? ""}
              required
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">de {puntajeMaximo}</span>
          </div>
        </div>

        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando..." : notaPrevia === null ? "Calificar" : "Actualizar nota"}
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`retro-${entregaId}`}>Retroalimentación (opcional)</Label>
        <Textarea
          id={`retro-${entregaId}`}
          name="retroalimentacion"
          rows={3}
          defaultValue={retroalimentacionPrevia ?? ""}
          placeholder="Qué estuvo bien y qué puede mejorar."
        />
      </div>

      {estado && !estado.success && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {estado.error}
        </p>
      )}

      {guardado && <p className="text-sm text-success">Calificación guardada.</p>}
    </form>
  );
}
