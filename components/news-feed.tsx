import Link from "next/link";
import { AlarmClock, Award, BookOpen, FileQuestion, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { textoDePlazo, type Novedad } from "@/lib/novedades";
import { notaSobreCinco } from "@/lib/grades";
import { cn } from "@/lib/utils";

/**
 * Las novedades del Estudiante (22/11/2026): lo que venció o está por
 * vencer, las notas que llegaron y el material nuevo de sus cursos.
 *
 * Cada novedad es un enlace al lugar donde se actúa sobre ella —la
 * actividad que hay que entregar, la pantalla de notas, la lección nueva—
 * porque un aviso que solo informa obliga a ir a buscarlo a mano.
 *
 * El único color fuerte es el del plazo vencido o de hoy; el resto va en
 * tonos neutros, siguiendo la regla de `DESIGN.md` de reservar el color
 * para lo que exige atención.
 */
export function NewsFeed({ novedades }: { novedades: Novedad[] }) {
  if (novedades.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="size-5 text-primary" aria-hidden="true" />
        <h2 className="font-heading text-xl font-bold text-foreground">Novedades</h2>
        <span className="text-sm text-muted-foreground">últimas dos semanas</span>
      </div>

      <ul className="space-y-2">
        {novedades.map((novedad) => (
          <li key={`${novedad.tipo}-${novedad.href}-${novedad.fecha.getTime()}`}>
            <Link
              href={novedad.href}
              className="flex items-start gap-3 rounded-2xl border border-border/80 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <Icono novedad={novedad} />

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{novedad.titulo}</span>
                  <Etiqueta novedad={novedad} />
                </div>

                <p className="truncate text-xs text-muted-foreground">{novedad.cursoTitulo}</p>

                {novedad.tipo === "nota" && novedad.retroalimentacion && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    “{novedad.retroalimentacion}”
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Icono({ novedad }: { novedad: Novedad }) {
  const urgente = novedad.tipo === "plazo" && novedad.diasRestantes <= 0;

  const Glifo =
    novedad.tipo === "plazo"
      ? AlarmClock
      : novedad.tipo === "nota"
        ? Award
        : novedad.clase === "evaluacion"
          ? FileQuestion
          : BookOpen;

  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        urgente ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
      )}
      aria-hidden="true"
    >
      <Glifo className="size-5" />
    </span>
  );
}

function Etiqueta({ novedad }: { novedad: Novedad }) {
  if (novedad.tipo === "plazo") {
    return (
      <Badge
        variant={novedad.diasRestantes <= 0 ? "destructive" : "warning"}
        className="font-semibold"
      >
        {textoDePlazo(novedad.diasRestantes)}
      </Badge>
    );
  }

  if (novedad.tipo === "nota") {
    return (
      <Badge variant={novedad.porcentaje >= 60 ? "success" : "destructive"} className="font-semibold tabular-nums">
        {notaSobreCinco(novedad.porcentaje)} / 5.0
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="font-semibold">
      {novedad.clase === "evaluacion" ? "Evaluación nueva" : "Lección nueva"}
    </Badge>
  );
}
