"use client";

import { useActionState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { alternarVisibilidadQuiz } from "@/lib/actions/toggle-quiz-visibility";
import { Button } from "@/components/ui/button";

const estadoInicial = null;

// Publica o retira el quiz. Un quiz nace oculto, así que este botón es el
// paso con el que el tutor lo pone a disposición de los estudiantes una vez
// le cargó las preguntas.
export function ToggleQuizVisibilityForm({
  quizId,
  visible,
}: {
  quizId: string;
  visible: boolean;
}) {
  const [estado, accion, enviando] = useActionState(alternarVisibilidadQuiz, estadoInicial);

  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="quizId" value={quizId} />

      <Button type="submit" variant={visible ? "outline" : "default"} disabled={enviando}>
        {visible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
        {enviando ? "Guardando..." : visible ? "Ocultar a los estudiantes" : "Publicar evaluación"}
      </Button>

      {estado && !estado.success && (
        <p role="alert" className="text-sm text-destructive">
          {estado.error}
        </p>
      )}
    </form>
  );
}
