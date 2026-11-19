"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { agregarPreguntaQuiz } from "@/lib/actions/add-quiz-question";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const estadoInicial = null;

const INDICES = [0, 1, 2, 3];

// Formulario para agregar preguntas, en línea y no en ventana: el tutor
// carga varias seguidas, así que se queda abierto y se vacía solo tras cada
// pregunta guardada. Misma excepción deliberada al patrón de diálogo que en
// `GradeSubmissionForm`.
export function AddQuestionForm({ quizId }: { quizId: string }) {
  const [estado, accion, enviando] = useActionState(agregarPreguntaQuiz, estadoInicial);

  // No hace falta vaciar el formulario a mano: React ya limpia los campos
  // no controlados al terminar una acción de formulario. Hacerlo con un
  // `ref` desde el render, además, rompe las reglas de React (no se puede
  // tocar el DOM durante el render) y eslint lo marca como error.

  return (
    <form action={accion} className="space-y-5 rounded-2xl border border-border/80 bg-card p-5">
      <input type="hidden" name="quizId" value={quizId} />

      <div className="space-y-2">
        <Label htmlFor="enunciado">Pregunta</Label>
        <Textarea
          id="enunciado"
          name="enunciado"
          required
          rows={2}
          placeholder="¿Qué hace el bloque 'repetir' en Scratch?"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">
          Opciones{" "}
          <span className="font-normal text-muted-foreground">
            — marca la correcta. Deja vacías las que no uses (mínimo dos).
          </span>
        </legend>

        {INDICES.map((indice) => (
          <div key={indice} className="flex items-center gap-3">
            <input
              type="radio"
              name="correcta"
              value={indice}
              defaultChecked={indice === 0}
              aria-label={`Marcar la opción ${indice + 1} como correcta`}
              className="size-4 shrink-0 accent-primary"
            />
            <Input
              name={`opcion${indice}`}
              placeholder={`Opción ${indice + 1}`}
              aria-label={`Texto de la opción ${indice + 1}`}
              required={indice < 2}
            />
          </div>
        ))}
      </fieldset>

      {estado && !estado.success && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {estado.error}
        </p>
      )}

      <div className="flex justify-end border-t border-border/60 pt-4">
        <Button type="submit" disabled={enviando}>
          <Plus className="size-4" aria-hidden="true" />
          {enviando ? "Agregando..." : "Agregar pregunta"}
        </Button>
      </div>
    </form>
  );
}
