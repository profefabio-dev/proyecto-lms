"use client";

import { useActionState, useState } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
import { eliminarActividad } from "@/lib/actions/delete-activity";
import { eliminarQuiz } from "@/lib/actions/delete-quiz";
import { Button } from "@/components/ui/button";

/**
 * OP08 (21/11/2026) — eliminar una actividad o una evaluación.
 *
 * El docente pidió las dos cosas en la misma frase: "no hay opción para
 * quitar o eliminar actividades creadas, deberían poderse eliminar y
 * confirmar para que no sea tan directo". De ahí las dos decisiones de este
 * componente:
 *
 * - **Doble confirmación**, el mismo patrón de `UnenrollStudentsForm`: un
 *   primer aviso y, solo después, el formulario real. Sin `confirm()` del
 *   navegador, que además bloquea la página.
 * - **Se dice qué se pierde antes de borrar.** El segundo paso nombra
 *   cuántas entregas o intentos de estudiantes se van con la eliminación —
 *   que es la diferencia real entre borrar algo recién creado por error y
 *   borrar trabajo de un curso en marcha.
 *
 * Un solo componente para los dos casos: el flujo es idéntico y lo único
 * que cambia es qué Server Action se llama y cómo se nombra lo que se
 * pierde.
 */
type Tipo = "actividad" | "evaluacion";
type Paso = "nada" | "primera" | "segunda";
type EstadoAccion = { success: boolean; error?: string } | null;

async function accionActividad(_prev: EstadoAccion, formData: FormData) {
  return eliminarActividad(null, formData);
}

async function accionQuiz(_prev: EstadoAccion, formData: FormData) {
  return eliminarQuiz(null, formData);
}

export function DeleteEvaluacionForm({
  tipo,
  id,
  titulo,
  trabajoAsociado,
}: {
  tipo: Tipo;
  id: string;
  titulo: string;
  /** Cuántas entregas (actividad) o intentos (evaluación) se van a perder. */
  trabajoAsociado: number;
}) {
  const esActividad = tipo === "actividad";
  const [estado, accion, enviando] = useActionState<EstadoAccion, FormData>(
    esActividad ? accionActividad : accionQuiz,
    null
  );
  const [paso, setPaso] = useState<Paso>("nada");

  const etiqueta = esActividad ? "actividad" : "evaluación";
  const trabajo = esActividad
    ? `${trabajoAsociado} ${trabajoAsociado === 1 ? "entrega" : "entregas"} de estudiantes`
    : `${trabajoAsociado} ${trabajoAsociado === 1 ? "intento" : "intentos"} de estudiantes`;

  if (paso === "nada") {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setPaso("primera")}
          className="gap-1.5 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          Eliminar
        </Button>

        {estado && !estado.success && estado.error && (
          <p role="alert" className="text-xs text-destructive">
            {estado.error}
          </p>
        )}
      </div>
    );
  }

  if (paso === "primera") {
    return (
      <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-semibold text-foreground">
          ¿Eliminar la {etiqueta} «{titulo}»?
        </p>
        <p className="text-xs text-muted-foreground">
          {trabajoAsociado > 0
            ? `Se perderán también ${trabajo}, con sus notas.`
            : `Todavía no tiene trabajo de estudiantes asociado.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setPaso("segunda")}>
            Sí, continuar
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setPaso("nada")}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={accion}
      className="space-y-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4"
    >
      <input
        type="hidden"
        name={esActividad ? "actividadId" : "quizId"}
        value={id}
      />

      <p className="flex items-start gap-2 text-sm font-bold text-destructive">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Esto no se puede deshacer. ¿Confirmas que quieres eliminar «{titulo}»
        {trabajoAsociado > 0 ? ` y ${trabajo}` : ""}?
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="destructive" disabled={enviando}>
          {enviando ? "Eliminando..." : `Sí, eliminar la ${etiqueta}`}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setPaso("nada")}
          disabled={enviando}
        >
          No, volver
        </Button>
      </div>

      {estado && !estado.success && estado.error && (
        <p role="alert" className="text-xs text-destructive">
          {estado.error}
        </p>
      )}
    </form>
  );
}
