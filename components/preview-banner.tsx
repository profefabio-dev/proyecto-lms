import Link from "next/link";
import { Eye, ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * US42 — la franja de "vista previa" (25/11/2026).
 *
 * Fija arriba, para que no haya ningún momento en que el Tutor crea que
 * está mirando su propio panel. Dice además **por qué todo aparece en cero**
 * —no tiene lecciones vistas ni entregas propias—, que es la pregunta que
 * se iba a hacer en los primeros cinco segundos.
 */
export function PreviewBanner({ courseId }: { courseId: string }) {
  return (
    <div className="sticky top-0 z-30 -mx-4 mb-2 border-b border-primary/30 bg-primary/15 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <p className="flex items-start gap-2 text-sm text-foreground">
          <Eye className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong>Vista previa.</strong> Así ve este curso un estudiante que acaba de entrar: en
            0 %, con todo pendiente. No puedes entregar ni responder desde aquí.
          </span>
        </p>

        <Link
          href={`/tutor/cursos/${courseId}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11 gap-2")}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a mi curso
        </Link>
      </div>
    </div>
  );
}
