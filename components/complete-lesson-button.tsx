"use client";

import { useActionState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { completarLeccion } from "@/lib/actions/complete-lesson";
import { Button } from "@/components/ui/button";

type EstadoAccion = { success: false; error: string } | null;

// `completarLeccion` termina en un `redirect`, así que cuando todo va bien
// no devuelve nada: el único estado que llega hasta aquí es el de error.
async function accion(_prevState: EstadoAccion, formData: FormData) {
  const resultado = await completarLeccion(formData);
  return resultado ?? null;
}

/**
 * US43 — botón principal del reproductor: marca la lección como completada
 * y pasa a la siguiente en un solo gesto.
 *
 * Si la lección ya estaba completada el botón cambia de texto ("Siguiente
 * lección") pero sigue siendo el mismo envío: volver a marcarla no duplica
 * nada (`skipDuplicates` en `registrarContenidosVistos`) y así el estudiante
 * que repasa tiene un único botón grande que siempre lo lleva hacia
 * adelante, en vez de dos controles distintos según el estado.
 */
export function CompleteLessonButton({
  contentId,
  visto,
  esUltima,
}: {
  contentId: string;
  visto: boolean;
  esUltima: boolean;
}) {
  const [estado, formAction, enviando] = useActionState(accion, null);

  const texto = visto
    ? esUltima
      ? "Volver al temario"
      : "Siguiente lección"
    : esUltima
      ? "Completar y terminar el curso"
      : "Completar y continuar";

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="contentId" value={contentId} />

      <Button type="submit" size="lg" disabled={enviando} className="w-full gap-2 font-bold sm:w-auto">
        {!visto && <Check className="size-4" aria-hidden="true" />}
        {enviando ? "Guardando..." : texto}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>

      {estado && !estado.success && (
        <p role="alert" className="text-sm text-destructive">
          {estado.error}
        </p>
      )}
    </form>
  );
}
