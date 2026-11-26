"use client";

import { useActionState, useState } from "react";
import { Megaphone, Pencil, Trash2, X } from "lucide-react";
import { eliminarAnuncio } from "@/lib/actions/delete-announcement";
import { editarAnuncio } from "@/lib/actions/edit-announcement";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

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
  puedeGestionar = false,
}: {
  anuncios: AnuncioVisible[];
  /**
   * El tutor del curso: ve los botones de editar y borrar. El estudiante no
   * recibe esta propiedad, y de todos modos las dos acciones comprueban en
   * el servidor que el curso sea suyo — ocultar un botón no es una
   * restricción.
   */
  puedeGestionar?: boolean;
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
          <Anuncio key={anuncio.id} anuncio={anuncio} puedeGestionar={puedeGestionar} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Un anuncio. En modo lectura muestra el cuerpo; en modo edición, el mismo
 * formulario con el que se escribió — igual que `EditContentForm` de OP06,
 * y detrás de un botón como manda OP07.
 */
function Anuncio({
  anuncio,
  puedeGestionar,
}: {
  anuncio: AnuncioVisible;
  puedeGestionar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [estado, accion, enviando] = useActionState(editarAnuncio, null);

  // El formulario **no se cierra solo** al guardar. Cerrarlo desde un efecto
  // (`if (estado.success) setEditando(false)`) es `setState` dentro de un
  // efecto, que `eslint` rechaza y que ya rompió el lint tres veces en este
  // proyecto — ver `AGENTS.md`. Se confirma en su sitio y el docente cierra,
  // igual que el formulario de preguntas de OP08, que también se queda
  // abierto a propósito con una franja que dice qué pasó.

  return (
    <li className="space-y-2 rounded-2xl border border-primary/25 bg-primary/5 p-4">
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

        {puedeGestionar && !editando && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditando(true)}
              aria-label="Editar este anuncio"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <BotonBorrar anuncioId={anuncio.id} />
          </div>
        )}

        {editando && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditando(false)}
            aria-label="Dejar de editar"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {editando ? (
        <form action={accion} className="space-y-3">
          <input type="hidden" name="anuncioId" value={anuncio.id} />
          <Input
            name="titulo"
            defaultValue={anuncio.titulo}
            required
            aria-label="Título del anuncio"
          />
          <Textarea
            name="cuerpo"
            defaultValue={anuncio.cuerpo}
            rows={4}
            required
            aria-label="Cuerpo del anuncio"
          />
          <p className="text-xs text-muted-foreground">
            Corregirlo no cambia su fecha ni lo vuelve a anunciar como nuevo.
          </p>

          {estado && !estado.success && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {estado.error}
            </p>
          )}

          {estado?.success && (
            <p className="text-xs font-medium text-emerald-500">
              Guardado. Tus estudiantes ya ven la corrección.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={enviando} className="font-semibold">
              {enviando ? "Guardando..." : "Guardar cambios"}
            </Button>
            {estado?.success && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditando(false)}
                className="font-semibold"
              >
                Listo
              </Button>
            )}
          </div>
        </form>
      ) : (
        <MarkdownContent contenido={anuncio.cuerpo} />
      )}
    </li>
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
