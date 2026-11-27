"use client";

import { useActionState, useState } from "react";
import { Video } from "lucide-react";
import { crearContenidoVideo } from "@/lib/actions/create-video-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

const estadoInicial = null;

export function CreateVideoContentForm({ courseId }: { courseId: string }) {
  const [estado, accion, enviando] = useActionState(crearContenidoVideo, estadoInicial);

  // El formulario vive dentro de un diálogo (rediseño de 2026-11). Antes los
  // tres formularios de material (video, documento y texto) estaban abiertos
  // a la vez en tres columnas, así que la página abría con una pared de
  // campos vacíos en lugar del contenido del curso.
  const [abierto, setAbierto] = useState(false);

  // Ajuste de estado durante el render (el patrón que recomienda React para
  // reaccionar a un cambio, en vez de un efecto): al publicarse el video se
  // cierra el diálogo. No hace falta un mensaje de "publicado": el video
  // nuevo aparece enseguida en la lista de contenido de atrás, por el
  // `revalidatePath` de la Server Action.
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
          <Button type="button" variant="outline">
            <Video className="size-4 text-muted-foreground" aria-hidden="true" />
            Publicar video
          </Button>
        }
      />

      <DialogContent
        titulo="Publicar video"
        descripcion="Inserta un enlace de YouTube para videoclases y explicaciones."
      >
        <form action={accion} className="space-y-5">
          <input type="hidden" name="courseId" value={courseId} />

          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" name="titulo" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Input id="descripcion" name="descripcion" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL de YouTube</Label>
            <Input
              id="url"
              name="url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
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
              {enviando ? "Publicando..." : "Publicar video"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
