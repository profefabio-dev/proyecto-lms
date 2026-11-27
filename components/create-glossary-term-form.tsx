"use client";

import { useActionState, useState } from "react";
import { BookA } from "lucide-react";
import { crearTermino } from "@/lib/actions/create-glossary-term";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

const estadoInicial = null;

/**
 * US54 — el Tutor agrega un término al glosario (27/11/2026). En ventana,
 * siguiendo el patrón de OP07, e igual que `CreateAnnouncementForm`.
 *
 * La ventana se cierra al guardar **comparando el estado anterior durante el
 * render**, que es el patrón que ya usa el formulario de anuncios — no un
 * `useEffect` con `setState`, que es el error que `AGENTS.md` anota como
 * repetido y que `eslint` rechaza.
 */
export function CreateGlossaryTermForm({ courseId }: { courseId: string }) {
  const [estado, accion, enviando] = useActionState(crearTermino, estadoInicial);
  const [abierto, setAbierto] = useState(false);

  const [estadoYaVisto, setEstadoYaVisto] = useState(estado);
  if (estado !== estadoYaVisto) {
    setEstadoYaVisto(estado);
    if (estado?.success) {
      setAbierto(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" className="gap-2">
            <BookA className="size-4" aria-hidden="true" />
            Agregar un término
          </Button>
        }
      />

      <DialogContent
        titulo="Agregar un término al glosario"
        descripcion="Tus estudiantes lo podrán consultar desde cualquier lección del curso."
      >
        <form action={accion} className="space-y-5">
          <input type="hidden" name="courseId" value={courseId} />

          <div className="space-y-2">
            <Label htmlFor="termino-glosario">Término</Label>
            <Input
              id="termino-glosario"
              name="termino"
              maxLength={60}
              placeholder="Algoritmo"
              required
            />
            <p className="text-xs text-muted-foreground">
              Se guarda como lo escribas. El orden del glosario es alfabético, no hace falta
              ordenarlo.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="definicion-glosario">Definición</Label>
            <Textarea
              id="definicion-glosario"
              name="definicion"
              rows={5}
              maxLength={1000}
              placeholder="Una serie de pasos ordenados para resolver un problema."
              required
            />
            <p className="text-xs text-muted-foreground">
              Escríbela con las palabras que usas en clase. Puedes usar <code>**negrita**</code> y
              listas con <code>-</code>, igual que en un anuncio.
            </p>
          </div>

          {estado && !estado.success && (
            <p
              role="alert"
              className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {estado.error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              }
            />
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando..." : "Agregar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
