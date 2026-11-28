"use client";

import { useActionState, useState } from "react";
import { Share2, Check, Copy, Lock, Hourglass, FileText } from "lucide-react";
import { alternarCursoCompartible } from "@/lib/actions/toggle-course-shareable";
import { PUNTOS_LICENCIA, RESUMEN_LICENCIA } from "@/lib/licencia-compartir";
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
  verificado,
  adopciones,
}: {
  courseId: string;
  compartible: boolean;
  /**
   * El sello del Super Administrador. Desde el 28/11/2026 es lo que publica
   * en el catálogo, así que acá decide si el estado es "en revisión" o
   * "publicado": antes este control daba a entender que compartir publicaba
   * de inmediato, y el docente iba a buscar su curso al catálogo sin
   * encontrarlo.
   */
  verificado: boolean;
  adopciones: number;
}) {
  const [estado, accion, enviando] = useActionState(alternarCursoCompartible, estadoInicial);
  const [copiado, setCopiado] = useState(false);
  // US57 (28/11/2026): la casilla de la licencia. Vive acá y no en un
  // diálogo aparte porque el permiso se da **en el mismo gesto** de
  // compartir; separarlo convierte el consentimiento en un trámite que se
  // acepta sin leer.
  const [acepta, setAcepta] = useState(false);

  // El valor que manda es el de la acción si ya respondió; si no, el que
  // vino del servidor.
  const activo = estado?.success ? estado.compartible : compartible;
  // Tres estados, no dos: guardado para mí · compartido y esperando
  // revisión · publicado en el catálogo.
  const publicado = activo && verificado;
  const enRevision = activo && !verificado;

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
            {publicado ? (
              <Share2 className="size-4 text-primary" aria-hidden="true" />
            ) : enRevision ? (
              <Hourglass className="size-4 text-amber-500" aria-hidden="true" />
            ) : (
              <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
            <h3 className="font-semibold text-foreground">
              {publicado
                ? "Publicado en el catálogo"
                : enRevision
                  ? "En revisión"
                  : "Solo tuyo"}
            </h3>
          </div>
          <p className="max-w-prose text-sm text-muted-foreground">
            {publicado
              ? "Está en el catálogo. Otro docente puede tomarlo y quedarse con su propia copia para su grupo: tu curso no se toca, y tu nombre aparece como autor en cada copia."
              : enRevision
                ? "Lo enviaste al catálogo y el administrador tiene que revisarlo antes de que aparezca. Mientras tanto nadie más puede verlo ni tomarlo. Si quieres, puedes dejar de compartirlo."
                : "Nadie más puede ver ni tomar este curso. Si lo compartes, pasa a revisión del administrador y, una vez aprobado, otros docentes podrán hacer su propia copia y adaptarla, sin modificar el tuyo."}
          </p>
        </div>

        <form action={accion} className="shrink-0">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="aceptaLicencia" value={acepta ? "si" : "no"} />
          <Button
            type="submit"
            variant={activo ? "outline" : "default"}
            disabled={enviando || (!activo && !acepta)}
          >
            {enviando ? "Guardando..." : activo ? "Dejar de compartir" : "Compartir"}
          </Button>
        </form>
      </div>

      {/* US57: los términos, en el mismo gesto de compartir. Solo cuando el
          curso todavía no está compartido: una vez dado el permiso, repetir
          el texto cada vez solo estorba. */}
      {!activo && (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={acepta}
              onChange={(e) => setAcepta(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="text-foreground">{RESUMEN_LICENCIA}</span>
          </label>

          <details className="text-sm">
            <summary className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-primary">
              <FileText className="size-3.5" aria-hidden="true" />
              Qué estás autorizando
            </summary>
            <ul className="mt-2 ml-5 list-outside list-disc space-y-1.5 text-muted-foreground marker:text-primary">
              {PUNTOS_LICENCIA.map((punto) => (
                <li key={punto}>{punto.replace(/\*\*/g, "")}</li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {/* El enlace solo cuando ya está publicado: mientras espera, la ficha
          no abre para nadie más que su autor. */}
      {publicado && (
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
