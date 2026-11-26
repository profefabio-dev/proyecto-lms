"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, ArrowRight, CheckCircle2, UserPlus } from "lucide-react";
import { unirseACursoConCodigo } from "@/lib/actions/join-course-by-code";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * El curso que encontró el buscador a partir de un código de clase
 * (26/11/2026).
 *
 * Sale de un reporte del docente: *"al buscar un curso con el código por el
 * rol de estudiante debería encontrarse y si es el caso decir que ya se
 * encuentra inscrito o inscribirse en ese curso"*. Hasta hoy el código solo
 * se podía escribir en el modal de "Unirme con código" del panel, y pegarlo
 * en el buscador del campus no encontraba nada — porque ese buscador (US17)
 * mira **solo los cursos donde el estudiante ya está inscrito**, y el curso
 * al que uno llega con un código es justamente uno donde todavía no está.
 *
 * **No se inscribe solo: se muestra el curso y se ofrece el botón.** Un
 * buscador que matricula por teclear algo sería un camino de una sola vía
 * sin confirmar nada.
 */
export function JoinByCodeResult({
  curso,
  codigo,
  yaInscrito,
}: {
  curso: { id: string; titulo: string; descripcion: string; autor: string };
  codigo: string;
  yaInscrito: boolean;
}) {
  const [estado, formAction, enviando] = useActionState(unirseACursoConCodigo, null);
  const router = useRouter();

  // Inscripción recién hecha: se confirma en la misma tarjeta y se entra al
  // curso, sin obligar a buscar de nuevo.
  if (estado?.success) {
    return (
      <Tarjeta codigo={codigo}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="font-heading text-sm font-bold text-foreground">
              {estado.yaInscrito ? "Ya estabas inscrito" : "¡Quedaste inscrito!"}
            </p>
            <p className="text-xs text-muted-foreground">{estado.titulo}</p>
          </div>
        </div>
        <Link
          href={`/estudiante/cursos/${estado.courseId}`}
          className={cn(buttonVariants({ size: "sm" }), "rounded-xl font-bold gap-1.5")}
          onClick={() => router.refresh()}
        >
          Entrar al curso <ArrowRight className="size-3.5" />
        </Link>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta codigo={codigo}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="size-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="font-heading text-sm font-bold text-foreground">{curso.titulo}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{curso.descripcion}</p>
          <p className="text-[11px] text-muted-foreground">
            Profesor: <span className="font-medium text-foreground/80">{curso.autor}</span>
          </p>
          {estado && !estado.success && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-xs font-medium text-destructive"
            >
              {estado.error}
            </p>
          )}
        </div>
      </div>

      {yaInscrito ? (
        <Link
          href={`/estudiante/cursos/${curso.id}`}
          className={cn(buttonVariants({ size: "sm" }), "rounded-xl font-bold gap-1.5")}
        >
          Ya estás inscrito — entrar <ArrowRight className="size-3.5" />
        </Link>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="codigo" value={codigo} />
          <Button type="submit" size="sm" disabled={enviando} className="rounded-xl font-bold gap-1.5">
            <UserPlus className="size-3.5" />
            {enviando ? "Inscribiendo..." : "Inscribirme en este curso"}
          </Button>
        </form>
      )}
    </Tarjeta>
  );
}

function Tarjeta({ codigo, children }: { codigo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
        Código de clase {codigo}
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {children}
      </div>
    </section>
  );
}
