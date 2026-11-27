"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { eliminarTermino } from "@/lib/actions/delete-glossary-term";
import { agruparPorLetra, type TerminoDelGlosario } from "@/lib/glosario";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { BookA } from "lucide-react";

/**
 * US54 — el glosario de un curso (27/11/2026). El mismo componente para las
 * dos vistas, como `AnnouncementList` en US53 y `DocumentContentList` en
 * US16: el Tutor lo ve con el botón de borrar, el Estudiante sin él.
 *
 * **Agrupado por letra y no en una lista plana**: un glosario se consulta, y
 * en un curso de Tecnología con treinta términos la diferencia entre buscar
 * y recorrer es el índice de letras de arriba.
 *
 * La definición se renderiza con `MarkdownContent`, nunca como HTML crudo:
 * es texto escrito por un Tutor y pasarlo tal cual sería una vía de XSS.
 */
export function GlossaryList({
  terminos,
  puedeGestionar = false,
}: {
  terminos: TerminoDelGlosario[];
  puedeGestionar?: boolean;
}) {
  const grupos = agruparPorLetra(terminos);

  if (grupos.length === 0) {
    return (
      <EmptyState
        icon={BookA}
        message={
          puedeGestionar
            ? "El glosario está vacío. Agrega los términos que tus estudiantes necesitan tener a mano."
            : "Tu profesor todavía no ha agregado términos a este curso."
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Índice de letras: lleva a cada grupo sin recorrer la lista. */}
      {grupos.length > 1 && (
        <nav aria-label="Letras del glosario" className="flex flex-wrap gap-1.5">
          {grupos.map((grupo) => (
            <a
              key={grupo.letra}
              href={`#glosario-${grupo.letra}`}
              className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-card text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {grupo.letra}
            </a>
          ))}
        </nav>
      )}

      {grupos.map((grupo) => (
        <section key={grupo.letra} id={`glosario-${grupo.letra}`} className="space-y-3">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-primary">
            {grupo.letra}
          </h2>

          <ul className="space-y-3">
            {grupo.terminos.map((termino) => (
              <li
                key={termino.id}
                className="space-y-2 rounded-2xl border border-border/80 bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-heading text-base font-bold text-foreground">
                    {termino.termino}
                  </p>
                  {puedeGestionar && <BotonBorrar terminoId={termino.id} />}
                </div>

                <MarkdownContent contenido={termino.definicion} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Una sola confirmación, igual que al borrar un anuncio (US53): un término
 * no se lleva entregas ni notas de nadie, y volver a escribirlo cuesta diez
 * segundos. La doble confirmación de OP08 está para lo que sí destruye
 * trabajo de estudiantes.
 */
function BotonBorrar({ terminoId }: { terminoId: string }) {
  const [estado, accion, enviando] = useActionState(eliminarTermino, null);
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirmando(true)}
        aria-label="Borrar este término"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">¿Lo borro?</span>
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirmando(false)}>
        No
      </Button>
      <form action={accion}>
        <input type="hidden" name="terminoId" value={terminoId} />
        <Button type="submit" variant="destructive" size="sm" disabled={enviando}>
          {enviando ? "Borrando..." : "Sí, borrar"}
        </Button>
      </form>

      {estado && !estado.success && (
        <span role="alert" className="text-xs text-destructive">
          {estado.error}
        </span>
      )}
    </div>
  );
}
