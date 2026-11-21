"use client";

import { useActionState, useState } from "react";
import { Link2 } from "lucide-react";
import { crearContenidoEnlace } from "@/lib/actions/create-link-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

const estadoInicial = null;

/** US45: publicar un recurso externo como lección propia del curso. */
export function CreateLinkContentForm({ courseId }: { courseId: string }) {
  const [estado, accion, enviando] = useActionState(crearContenidoEnlace, estadoInicial);
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
          <Button type="button" variant="outline">
            <Link2 className="size-4 text-muted-foreground" aria-hidden="true" />
            Publicar enlace
          </Button>
        }
      />

      <DialogContent
        titulo="Publicar recurso externo"
        descripcion="Una simulación, un artículo o una herramienta en línea. Se abre en otra pestaña, así el estudiante no pierde el curso."
      >
        <form action={accion} className="space-y-5">
          <input type="hidden" name="courseId" value={courseId} />

          <div className="space-y-2">
            <Label htmlFor="titulo-enlace">Título</Label>
            <Input
              id="titulo-enlace"
              name="titulo"
              required
              placeholder="Ej. Simulador de circuitos"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion-enlace">¿Qué debe hacer ahí? (opcional)</Label>
            <Input id="descripcion-enlace" name="descripcion" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url-enlace">Dirección del recurso</Label>
            <Input
              id="url-enlace"
              name="url"
              type="url"
              required
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Debe empezar por http:// o https://
            </p>
          </div>

          {estado && !estado.success && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
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
              {enviando ? "Publicando..." : "Publicar enlace"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
