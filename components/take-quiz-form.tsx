"use client";

import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import { Check,
  Send,
  CheckCircle2,
  Trophy,
  AlertCircle,
  RotateCcw,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { responderQuiz } from "@/lib/actions/submit-quiz";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const estadoInicial = null;

const LETRAS_OPCION = ["A", "B", "C", "D", "E", "F", "G", "H"];

type Pregunta = {
  id: string;
  enunciado: string;
  opciones: { id: string; texto: string }[];
};

export function TakeQuizForm({
  quizId,
  courseId,
  preguntas,
  yaIntentado,
}: {
  quizId: string;
  courseId?: string;
  preguntas: Pregunta[];
  yaIntentado: boolean;
}) {
  const [estado, accion, enviando] = useActionState(responderQuiz, estadoInicial);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});

  const totalPreguntas = preguntas.length;
  const respondidasCount = Object.keys(respuestas).length;
  const progresoPorcentaje =
    totalPreguntas > 0 ? Math.round((respondidasCount / totalPreguntas) * 100) : 0;
  const todasRespondidas = totalPreguntas > 0 && respondidasCount === totalPreguntas;

  // Celebración con confeti al aprobar la evaluación
  useEffect(() => {
    if (estado?.success && estado.puntaje >= 60) {
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.5 },
        });
      });
    }
  }, [estado]);

  // Pantalla de resultados tras enviar la evaluación
  if (estado?.success) {
    const aprobado = estado.puntaje >= 60;
    // Escala colombiana 1.0 a 5.0
    const notaSobreCinco = (1 + (estado.puntaje / 100) * 4).toFixed(1);

    return (
      <div className="space-y-6">
        <div
          className={`relative overflow-hidden rounded-2xl border p-6 sm:p-10 text-center transition-all ${
            aprobado
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/30 bg-amber-500/5"
          }`}
        >
          {/* Icono de estado */}
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border bg-card/80 shadow-inner">
            {aprobado ? (
              <Trophy className="size-8 text-emerald-500" />
            ) : (
              <AlertCircle className="size-8 text-amber-500" />
            )}
          </div>

          <div className="space-y-2">
            <Badge
              variant={aprobado ? "success" : "warning"}
              className="px-3 py-1 text-xs font-bold uppercase tracking-wider"
            >
              {aprobado ? "¡Evaluación Aprobada!" : "Evaluación por Mejorar"}
            </Badge>

            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {estado.puntaje}%
            </h2>

            <p className="font-mono text-sm font-semibold text-muted-foreground">
              Calificación: <span className="text-foreground font-bold">{notaSobreCinco}</span> / 5.0
            </p>

            <p className="text-sm text-muted-foreground max-w-md mx-auto pt-1">
              {aprobado
                ? "¡Excelente trabajo! Demostraste un gran dominio de los conceptos de esta lección."
                : "Buen esfuerzo. Te recomendamos repasar los temas clave del curso y volver a intentarlo."}
            </p>
          </div>

          {/* Tarjetas de desglose rápido */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 max-w-sm mx-auto text-left">
            <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Aciertos
              </span>
              <p className="mt-1 font-heading text-2xl font-bold text-foreground">
                {estado.correctas}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  de {estado.total}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resultado
              </span>
              <p
                className={`mt-1 font-heading text-xl font-bold ${
                  aprobado ? "text-emerald-500" : "text-amber-500"
                }`}
              >
                {aprobado ? "Aprobado" : "Reprobado"}
              </p>
            </div>
          </div>

          {/* Acciones posteriores */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
              className="rounded-2xl font-semibold min-h-11 gap-2"
            >
              <RotateCcw className="size-4" />
              Nuevo intento
            </Button>

            {courseId && (
              <Link
                href={`/estudiante/cursos/${courseId}`}
                className={cn(buttonVariants(), "rounded-2xl font-semibold min-h-11 gap-2")}
              >
                <ArrowLeft className="size-4" />
                Volver al curso
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={accion} className="space-y-6">
      <input type="hidden" name="quizId" value={quizId} />

      {/* Barra de progreso flotante/adherente */}
      <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 rounded-2xl border border-border/80 bg-background/95 px-4 py-3 shadow-xs backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2
              className={`size-4 transition-colors ${
                todasRespondidas ? "text-emerald-500" : "text-primary"
              }`}
            />
            <span className="text-xs font-bold text-foreground">
              {respondidasCount} de {totalPreguntas} respondidas
            </span>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-xs sm:max-w-sm">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  todasRespondidas ? "bg-emerald-500" : "bg-primary"
                }`}
                style={{ width: `${progresoPorcentaje}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-muted-foreground w-9 text-right">
              {progresoPorcentaje}%
            </span>
          </div>
        </div>
      </div>

      {yaIntentado && (
        <div className="flex items-start gap-3 rounded-2xl border border-border/80 bg-muted/30 p-4 text-xs text-muted-foreground">
          <Sparkles className="size-4 shrink-0 text-primary mt-0.5" />
          <p>
            Ya respondiste esta evaluación anteriormente. Este será un nuevo intento; todos se
            registran en tu historial y el docente tomará en cuenta tu mejor calificación.
          </p>
        </div>
      )}

      {/* Lista de preguntas */}
      <ol className="space-y-6">
        {preguntas.map((pregunta, indice) => {
          const respondida = Boolean(respuestas[pregunta.id]);

          return (
            <li
              key={pregunta.id}
              className={`space-y-4 rounded-2xl border p-5 sm:p-6 transition-all ${
                respondida
                  ? "border-primary/40 bg-card shadow-xs"
                  : "border-border/80 bg-card/60"
              }`}
            >
              <fieldset className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <legend className="font-heading text-base font-bold text-foreground leading-snug">
                    <span className="mr-2 inline-flex size-6 items-center justify-center rounded-2xl bg-primary/10 text-xs font-mono font-bold text-primary">
                      {indice + 1}
                    </span>
                    {pregunta.enunciado}
                  </legend>

                  {respondida && (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[11px] font-semibold"
                    >
                      Respondida
                    </Badge>
                  )}
                </div>

                <div className="grid gap-2.5">
                  {pregunta.opciones.map((opcion, opcionIdx) => {
                    const seleccionada = respuestas[pregunta.id] === opcion.id;
                    const letra = LETRAS_OPCION[opcionIdx] ?? String(opcionIdx + 1);

                    return (
                      <label
                        key={opcion.id}
                        className={`group flex min-h-12 cursor-pointer items-center gap-3.5 rounded-2xl border p-3.5 transition-all ${
                          seleccionada
                            ? "border-primary bg-primary/8 shadow-xs text-foreground"
                            : "border-border/70 bg-card/40 hover:border-border hover:bg-muted/40 text-foreground/90"
                        }`}
                      >
                        {/* Insignia de letra A, B, C, D */}
                        <div
                          className={`flex size-7 shrink-0 items-center justify-center rounded-2xl border font-mono text-xs font-bold transition-all ${
                            seleccionada
                              ? "border-primary bg-primary text-primary-foreground shadow-xs"
                              : "border-border/80 bg-muted/30 text-muted-foreground group-hover:border-primary/40 group-hover:text-foreground"
                          }`}
                        >
                          {letra}
                        </div>

                        <input
                          type="radio"
                          name={`pregunta-${pregunta.id}`}
                          value={opcion.id}
                          checked={seleccionada}
                          onChange={() =>
                            setRespuestas((prev) => ({
                              ...prev,
                              [pregunta.id]: opcion.id,
                            }))
                          }
                          className="size-4 shrink-0 accent-primary"
                        />

                        <span className="text-sm font-medium leading-relaxed">
                          {opcion.texto}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>

      {estado && !estado.success && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive"
        >
          <AlertCircle className="size-5 shrink-0" />
          <p>{estado.error}</p>
        </div>
      )}

      {/* Barra de envío */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-4">
        <p className="text-xs text-muted-foreground text-center sm:text-left">
          {todasRespondidas ? (
            <span className="text-emerald-500 font-semibold">
              <Check className="size-4 shrink-0" aria-hidden="true" /> Has respondido todas las
              preguntas. ¡Listo para calificar!
            </span>
          ) : (
            <span>
              Faltan{" "}
              <strong className="text-foreground">
                {totalPreguntas - respondidasCount}
              </strong>{" "}
              preguntas por responder.
            </span>
          )}
        </p>

        <Button
          type="submit"
          disabled={enviando}
          className="w-full sm:w-auto min-h-11 rounded-2xl font-semibold gap-2 shadow-xs"
        >
          <Send className="size-4" aria-hidden="true" />
          {enviando ? "Calificando evaluación..." : "Enviar respuestas"}
        </Button>
      </div>
    </form>
  );
}
