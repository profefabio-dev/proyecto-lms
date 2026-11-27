"use client";

import { useActionState, useState } from "react";
import { Share2, Check, Copy, Lock } from "lucide-react";
import { alternarCursoCompartible } from "@/lib/actions/toggle-course-shareable";
import { Button } from "@/components/ui/button";

const estadoInicial = null;

/**
 * US47 — el control para compartir un curso con otros docentes
 * (23/11/2026).
 *
 * Cuando el curso está compartido muestra además el enlace de su ficha,
 * porque mientras no exista el catálogo (US48) esa es la única forma de
 * que otro docente llegue: el autor se lo pasa. El enlace se arma en el
 * navegador con `window.location.origin` para que funcione igual en
 * desarrollo y en producción sin configurar nada.
 */
export function ShareCourseForm({
  courseId,
  compartible,
  adopciones,
}: {
  courseId: string;
  compartible: boolean;
  adopciones: number;
}) {
  const [estado, accion, enviando] = useActionState(alternarCursoCompartible, estadoInicial);
  const [copiado, setCopiado] = useState(false);

  // El valor que manda es el de la acción si ya respondió; si no, el que
  // vino del servidor.
  const activo = estado?.success ? estado.compartible : compartible;

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/tutor/catalogo/${courseId}`
      );
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles no se puede hacer nada útil; el enlace
      // está a la vista para copiarlo a mano.
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {activo ? (
              <Share2 className="size-4 text-primary" aria-hidden="true" />
            ) : (
              <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
            <h3 className="font-semibold text-foreground">
              {activo ? "Compartido con otros docentes" : "Solo tuyo"}
            </h3>
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">
            {activo
              ? "Otro docente puede tomar este curso y quedarse con su propia copia para su grupo. Tu curso no se toca, y tu nombre aparece como autor en cada copia."
              : "Nadie más puede ver ni tomar este curso. Si lo compartes, otros docentes podrán hacer su propia copia y adaptarla, sin modificar el tuyo."}
          </p>
        </div>

        <form action={accion}>
          <input type="hidden" name="courseId" value={courseId} />
          <Button type="submit" variant={activo ? "outline" : "default"} disabled={enviando}>
            {enviando ? "Guardando..." : activo ? "Dejar de compartir" : "Compartir"}
          </Button>
        </form>
      </div>

      {activo && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={copiarEnlace}>
            {copiado ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copiado ? "Enlace copiado" : "Copiar enlace para un colega"}
          </Button>

          {adopciones > 0 && (
            <span className="text-sm text-muted-foreground">
              {adopciones === 1
                ? "1 docente ya tomó este curso."
                : `${adopciones} docentes ya tomaron este curso.`}
            </span>
          )}
        </div>
      )}

      {estado && !estado.success && (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {estado.error}
        </p>
      )}
    </div>
  );
}
