"use client";

import { useActionState, useState } from "react";
import { Code2 } from "lucide-react";
import { crearContenidoCodigo } from "@/lib/actions/create-code-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

const estadoInicial = null;

/** US45: publicar un fragmento de código como lección propia del curso. */
export function CreateCodeContentForm({ courseId }: { courseId: string }) {
  const [estado, accion, enviando] = useActionState(crearContenidoCodigo, estadoInicial);
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
            <Code2 className="size-4 text-primary" aria-hidden="true" />
            Publicar código
          </Button>
        }
      />

      <DialogContent
        titulo="Publicar código"
        descripcion="Se muestra en monoespaciado, con su sangría intacta y con scroll propio si las líneas son largas."
      >
        <form action={accion} className="space-y-5">
          <input type="hidden" name="courseId" value={courseId} />

          <div className="space-y-2">
            <Label htmlFor="titulo-codigo">Título</Label>
            <Input
              id="titulo-codigo"
              name="titulo"
              required
              placeholder="Ej. Ciclo for en Python"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion-codigo">Descripción (opcional)</Label>
            <Input id="descripcion-codigo" name="descripcion" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lenguaje-codigo">Lenguaje (opcional)</Label>
            <Input
              id="lenguaje-codigo"
              name="lenguaje"
              placeholder="python, javascript, html..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigo">Código</Label>
            <Textarea
              id="codigo"
              name="codigo"
              required
              rows={10}
              className="font-mono text-sm"
              placeholder={'for i in range(5):\n    print("Hola", i)'}
            />
            <p className="text-xs text-muted-foreground">
              Pégalo tal como va: los espacios del principio de cada línea se conservan.
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
              {enviando ? "Publicando..." : "Publicar código"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
