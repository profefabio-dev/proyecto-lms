"use client";

import { useActionState, useState } from "react";
import { FileText } from "lucide-react";
import { crearContenidoTexto } from "@/lib/actions/create-text-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

const estadoInicial = null;

export function CreateTextContentForm({ courseId }: { courseId: string }) {
  const [estado, accion, enviando] = useActionState(crearContenidoTexto, estadoInicial);

  // Mismo patrón que los otros formularios de material (rediseño de
  // 2026-11). De los tres este es el que más gana: el área de redacción
  // necesita ancho, y en una de tres columnas quedaba muy estrecha para
  // escribir una lectura completa.
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
            <FileText className="size-4 text-duo-green" aria-hidden="true" />
            Publicar texto
          </Button>
        }
      />

      <DialogContent
        titulo="Publicar texto"
        descripcion="Redacta explicaciones con formato Markdown."
      >
        <form action={accion} className="space-y-5">
          <input type="hidden" name="courseId" value={courseId} />

          <div className="space-y-2">
            <Label htmlFor="titulo-texto">Título</Label>
            <Input id="titulo-texto" name="titulo" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion-texto">Descripción (opcional)</Label>
            <Input id="descripcion-texto" name="descripcion" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contenido">Contenido</Label>
            <Textarea
              id="contenido"
              name="contenido"
              required
              rows={10}
              placeholder={"# Título\n\nTexto con **negrita** y listas:\n\n- Punto uno\n- Punto dos"}
            />
            <p className="text-xs text-muted-foreground">
              Admite formato Markdown: # para títulos, **texto** para negrita y - para listas.
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
              {enviando ? "Publicando..." : "Publicar contenido"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
