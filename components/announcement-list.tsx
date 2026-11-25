"use client";

import { useActionState, useState } from "react";
import { Megaphone, Trash2 } from "lucide-react";
import { eliminarAnuncio } from "@/lib/actions/delete-announcement";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";

export type AnuncioVisible = {
  id: string;
  titulo: string;
  cuerpo: string;
  createdAt: Date;
  autor: string;
};

/**
 * US53 — los anuncios de un curso (25/11/2026). El mismo componente para
 * las dos vistas: el Tutor los ve con el botón de borrar, el Estudiante sin
 * él. Se comparte a propósito, igual que `DocumentContentList` en US16 — si
 * se duplica, las dos vistas se separan con el primer cambio.
 *
 * El cuerpo se renderiza con `MarkdownContent`, nunca como HTML crudo: es
 * texto escrito por un Tutor y pasarlo tal cual sería una vía de XSS.
 */
export function AnnouncementList({
  anuncios,
  puedeBorrar = false,
}: {
  anuncios: AnuncioVisible[];
  puedeBorrar?: boolean;
}) {
  if (anuncios.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone className="size-5 text-primary" aria-hidden="true" />
        <h2 className="font-heading text-lg font-bold text-foreground">Anuncios</h2>
      </div>

      <ul className="space-y-3">
        {anuncios.map((anuncio) => (
          <li
            key={anuncio.id}
            className="space-y-2 rounded-2xl border border-primary/25 bg-primary/5 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold text-foreground">{anuncio.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {anuncio.autor} ·{" "}
                  {anuncio.createdAt.toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>

              {puedeBorrar && <BotonBorrar anuncioId={anuncio.id} />}
            </div>

            <MarkdownContent contenido={anuncio.cuerpo} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Una sola confirmación, no la doble de eliminar una actividad (OP08): ahí
 * el segundo paso existe porque se pierden entregas y notas de estudiantes.
 * Borrar un anuncio no se lleva nada de nadie.
 */
function BotonBorrar({ anuncioId }: { anuncioId: string }) {
  const [estado, accion, enviando] = useActionState(eliminarAnuncio, null);
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirmando(true)}
        aria-label="Borrar este anuncio"
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
        <input type="hidden" name="anuncioId" value={anuncioId} />
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
