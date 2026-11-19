"use client";

import { useActionState, useState } from "react";
import { FileUp } from "lucide-react";
import { subirDocumento } from "@/lib/actions/create-document-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

const estadoInicial = null;

export function UploadDocumentForm({ courseId }: { courseId: string }) {
  const [estado, accion, enviando] = useActionState(subirDocumento, estadoInicial);

  // Mismo patrón que los otros formularios de material: vive dentro de un
  // diálogo, en vez de estar siempre abierto en la página (rediseño de
  // 2026-11). Aquí además gana espacio: en tres columnas la etiqueta del
  // archivo partía en dos líneas y el selector salía cortado.
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
            <FileUp className="size-4 text-duo-orange" aria-hidden="true" />
            Subir documento
          </Button>
        }
      />

      <DialogContent
        titulo="Subir documento"
        descripcion="Adjunta talleres y lecturas en PDF o Word."
      >
        <form action={accion} className="space-y-5">
          <input type="hidden" name="courseId" value={courseId} />

          <div className="space-y-2">
            <Label htmlFor="titulo-doc">Título</Label>
            <Input id="titulo-doc" name="titulo" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion-doc">Descripción (opcional)</Label>
            <Input id="descripcion-doc" name="descripcion" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="archivo">Archivo</Label>
            <Input
              id="archivo"
              name="archivo"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              required
            />
            <p className="text-xs text-muted-foreground">PDF o Word, máximo 10 MB.</p>
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
              {enviando ? "Subiendo..." : "Subir documento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
