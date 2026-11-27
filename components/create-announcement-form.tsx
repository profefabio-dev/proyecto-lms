"use client";

import { useActionState, useState } from "react";
import { Megaphone } from "lucide-react";
import { crearAnuncio } from "@/lib/actions/create-announcement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

const estadoInicial = null;

/**
 * US53 — el Tutor publica un anuncio (25/11/2026). En ventana, siguiendo el
 * patrón de OP07: lo que se consulta está a la vista, lo que se edita está
 * detrás de un botón.
 */
export function CreateAnnouncementForm({ courseId }: { courseId: string }) {
  const [estado, accion, enviando] = useActionState(crearAnuncio, estadoInicial);
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
            <Megaphone className="size-4" aria-hidden="true" />
            Publicar un anuncio
          </Button>
        }
      />

      <DialogContent
        titulo="Publicar un anuncio"
        descripcion="Lo verán tus estudiantes en su panel y en la portada del curso."
      >
        <form action={accion} className="space-y-5">
          <input type="hidden" name="courseId" value={courseId} />

          <div className="space-y-2">
            <Label htmlFor="titulo-anuncio">Título</Label>
            <Input
              id="titulo-anuncio"
              name="titulo"
              maxLength={120}
              placeholder="Mañana traigan la protoboard"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cuerpo-anuncio">El anuncio</Label>
            <Textarea
              id="cuerpo-anuncio"
              name="cuerpo"
              rows={6}
              placeholder="Escribe aquí lo que quieres decirles."
              required
            />
            <p className="text-xs text-muted-foreground">
              Puedes usar <code>**negrita**</code>, listas con <code>-</code> y títulos con{" "}
              <code>#</code>, igual que en las instrucciones de una actividad.
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
              {enviando ? "Publicando..." : "Publicar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
