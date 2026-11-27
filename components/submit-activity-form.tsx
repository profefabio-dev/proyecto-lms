"use client";

import { useActionState, useState } from "react";
import { Send, Lock } from "lucide-react";
import { entregarActividad } from "@/lib/actions/submit-activity";
import { textoDeLoQueSeEspera, type TipoEntrega } from "@/lib/activity-submission";
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
  // US52 (25/11/2026): qué exige el docente, y si la actividad ya cerró.
  // `AMBOS` por defecto para que nada cambie donde no se use.
  tipoEntrega = "AMBOS",
  cerrada = false,
  // US42 (25/11/2026): el Tutor mirando su propio curso como lo ve un
  // estudiante. De solo lectura.
  vistaPrevia = false,
}: {
  actividadId: string;
  titulo: string;
  yaEntregada: boolean;
  textoPrevio?: string | null;
  nombreArchivoPrevio?: string | null;
  tipoEntrega?: TipoEntrega;
  cerrada?: boolean;
  vistaPrevia?: boolean;
}) {
  const [estado, accion, enviando] = useActionState(entregarActividad, estadoInicial);
  const [abierto, setAbierto] = useState(false);

  const pideTexto = tipoEntrega !== "SOLO_ARCHIVO";
  const pideArchivo = tipoEntrega !== "SOLO_TEXTO";

  const [estadoYaVisto, setEstadoYaVisto] = useState(estado);
  if (estado !== estadoYaVisto) {
    setEstadoYaVisto(estado);
    if (estado?.success) {
      setAbierto(false);
    }
  }

  // US42: en vista previa el botón se muestra deshabilitado, no se oculta —
  // el Tutor tiene que ver que ahí hay un botón de entregar, que es parte
  // de lo que vino a revisar.
  if (vistaPrevia) {
    return (
      <Button type="button" variant="outline" disabled>
        <Send className="size-4" aria-hidden="true" />
        Entregar
      </Button>
    );
  }

  // Cerrada: no se ofrece el botón. La guarda de verdad está en el servidor
  // (`entregarActividad`), esto solo evita que el estudiante escriba una
  // respuesta completa para que se la rechacen al enviarla.
  if (cerrada) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="size-4" aria-hidden="true" />
        {yaEntregada
          ? "Esta actividad ya cerró. Tu entrega quedó registrada."
          : "Esta actividad ya cerró y no acepta más entregas."}
      </p>
    );
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
            <p className="rounded-2xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Si vuelves a entregar, tu entrega anterior se reemplaza y la nota que tuviera queda
              sin efecto hasta que tu profesor la revise de nuevo.
            </p>
          )}

          {/* US52: se le dice de una vez qué se espera, en vez de dejarlo
              descubrirlo al enviar. Y el campo que no aplica no se muestra:
              un campo deshabilitado invita a preguntarse por qué está ahí. */}
          {tipoEntrega !== "AMBOS" && (
            <p className="rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
              {textoDeLoQueSeEspera(tipoEntrega)}
            </p>
          )}

          {pideTexto && (
            <div className="space-y-2">
              <Label htmlFor="texto-entrega">Tu respuesta</Label>
              <Textarea
                id="texto-entrega"
                name="texto"
                rows={8}
                defaultValue={textoPrevio ?? ""}
                placeholder={
                  pideArchivo
                    ? "Escribe aquí tu respuesta, o déjalo vacío si vas a adjuntar un archivo."
                    : "Escribe aquí tu respuesta."
                }
              />
            </div>
          )}

          {pideArchivo && (
            <div className="space-y-2">
              <Label htmlFor="archivo-entrega">
                {pideTexto ? "Archivo (opcional)" : "Tu archivo"}
              </Label>
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

              {/* Sin esta casilla, un archivo adjunto por error se quedaba
                  pegado a la entrega para siempre: se podía reemplazar por
                  otro, pero nunca volver a entregar solo texto. No aplica
                  cuando el archivo es obligatorio: quitarlo dejaría la
                  entrega sin lo único que se pedía. */}
              {nombreArchivoPrevio && pideTexto && (
                <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    name="quitarArchivo"
                    className="size-5 accent-primary"
                  />
                  Quitar el archivo adjunto y entregar solo el texto
                </label>
              )}
            </div>
          )}

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
              {enviando ? "Enviando..." : "Enviar entrega"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
