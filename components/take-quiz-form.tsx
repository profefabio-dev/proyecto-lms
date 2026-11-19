"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { responderQuiz } from "@/lib/actions/submit-quiz";
import { Button } from "@/components/ui/button";

const estadoInicial = null;

type Pregunta = {
  id: string;
  enunciado: string;
  // Sin `esCorrecta`: la respuesta correcta no sale del servidor, así que
  // no hay forma de leerla desde el navegador ni de calificar en el cliente.
  opciones: { id: string; texto: string }[];
};

export function TakeQuizForm({
  quizId,
  preguntas,
  yaIntentado,
}: {
  quizId: string;
  preguntas: Pregunta[];
  yaIntentado: boolean;
}) {
  const [estado, accion, enviando] = useActionState(responderQuiz, estadoInicial);

  // Tras enviar, se muestra el resultado en lugar del formulario: volver a
  // ver las mismas opciones marcadas confunde sobre si ya se envió o no.
  if (estado?.success) {
    const aprobado = estado.puntaje >= 60;

    return (
      <div
        className={`space-y-3 rounded-2xl border p-6 text-center ${
          aprobado
            ? "border-success-border bg-success-soft"
            : "border-destructive/30 bg-destructive/10"
        }`}
      >
        <p className="font-heading text-3xl font-bold text-foreground">{estado.puntaje}%</p>
        <p className="text-sm text-foreground">
          Acertaste {estado.correctas} de {estado.total} preguntas.
        </p>
        <p className="text-xs text-muted-foreground">
          Tu intento quedó registrado. Puedes volver a intentarlo recargando la página.
        </p>
      </div>
    );
  }

  return (
    <form action={accion} className="space-y-6">
      <input type="hidden" name="quizId" value={quizId} />

      {yaIntentado && (
        <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Ya respondiste esta evaluación antes. Este será un intento nuevo; se guardan todos y tu
          profesor ve tu mejor resultado.
        </p>
      )}

      <ol className="space-y-6">
        {preguntas.map((pregunta, indice) => (
          <li key={pregunta.id} className="space-y-3 rounded-2xl border border-border/80 bg-card p-5">
            <fieldset className="space-y-3">
              <legend className="font-heading text-base font-bold text-foreground">
                {indice + 1}. {pregunta.enunciado}
              </legend>

              {pregunta.opciones.map((opcion) => (
                <label
                  key={opcion.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border/60 px-3 py-2 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    name={`pregunta-${pregunta.id}`}
                    value={opcion.id}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span className="text-sm text-foreground">{opcion.texto}</span>
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ol>

      {estado && !estado.success && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {estado.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={enviando}>
          <Send className="size-4" aria-hidden="true" />
          {enviando ? "Calificando..." : "Enviar respuestas"}
        </Button>
      </div>
    </form>
  );
}
