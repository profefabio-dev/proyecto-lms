"use client";

import { useActionState, useState } from "react";
import { Send } from "lucide-react";
import { entregarActividad } from "@/lib/actions/submit-activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

const estadoInicial = null;

export function SubmitActivityForm({
  actividadId,
  titulo,
  yaEntregada,
  textoPrevio,
  nombreArchivoPrevio,
}: {
  actividadId: string;
  titulo: string;
  yaEntregada: boolean;
  textoPrevio?: string | null;
  nombreArchivoPrevio?: string | null;
}) {
  const [estado, accion, enviando] = useActionState(entregarActividad, estadoInicial);
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
          <Button type="button" variant={yaEntregada ? "outline" : "default"}>
            <Send className="size-4" aria-hidden="true" />
            {yaEntregada ? "Cambiar mi entrega" : "Entregar"}
          </Button>
        }
      />

      <DialogContent
        titulo={yaEntregada ? "Cambiar mi entrega" : "Entregar actividad"}
        descripcion={titulo}
      >
        <form action={accion} className="space-y-5">
          <input type="hidden" name="actividadId" value={actividadId} />

          {yaEntregada && (
            <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Si vuelves a entregar, tu entrega anterior se reemplaza y la nota que tuviera queda
              sin efecto hasta que tu profesor la revise de nuevo.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="texto-entrega">Tu respuesta</Label>
            <Textarea
              id="texto-entrega"
              name="texto"
              rows={8}
              defaultValue={textoPrevio ?? ""}
              placeholder="Escribe aquí tu respuesta, o déjalo vacío si vas a adjuntar un archivo."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="archivo-entrega">Archivo (opcional)</Label>
            <Input
              id="archivo-entrega"
              name="archivo"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
            />
            <p className="text-xs text-muted-foreground">
              PDF, Word o una foto (JPG, PNG, WEBP), máximo 10 MB.
              {nombreArchivoPrevio
                ? ` Ahora tienes adjunto "${nombreArchivoPrevio}"; si no eliges otro, se conserva.`
                : ""}
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
              {enviando ? "Enviando..." : "Enviar entrega"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
