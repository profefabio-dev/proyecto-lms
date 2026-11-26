"use client";

import { useState } from "react";
import { Copy, Check, KeyRound, QrCode } from "lucide-react";
import { formatearCodigoCurso } from "@/lib/course-code";

export function CourseClassCodeCard({
  courseId,
  tituloCurso,
}: {
  courseId: string;
  tituloCurso: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const codigo = formatearCodigoCurso(courseId);

  const copiarAlPortapapeles = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback si clipboard falla
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="size-4" />
          </span>
          <span className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
            Código de Clase
          </span>
        </div>

        <button
          type="button"
          onClick={copiarAlPortapapeles}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shadow-2xs"
          title="Copiar código al portapapeles"
        >
          {copiado ? (
            <>
              <Check className="size-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-bold">¡Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/80 bg-background/60 p-3.5">
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Clave de inscripción
          </p>
          <span className="font-mono text-xl sm:text-2xl font-extrabold tracking-widest text-primary">
            {codigo}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Proyecta o comparte este código con tus alumnos. Al ingresarlo en su panel, quedarán inscritos al instante en <strong className="text-foreground">{tituloCurso}</strong>.
      </p>
    </div>
  );
}
