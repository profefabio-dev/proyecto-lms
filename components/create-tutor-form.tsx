"use client";

import { useActionState, useState } from "react";
import { UserPlus, Copy, Check, CheckCircle2 } from "lucide-react";
import { crearTutor } from "@/lib/actions/create-tutor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

type EstadoAccion =
  | { success: true; passwordTemporal: string }
  | { success: false; error: string }
  | null;

async function accionInicial(_prevState: EstadoAccion, formData: FormData) {
  return crearTutor(formData);
}

const valoresIniciales = { nombre: "", apellido: "", email: "" };

function TutorFormBody({
  onCerrar,
  onCrearOtro,
}: {
  onCerrar: () => void;
  onCrearOtro: () => void;
}) {
  const [estado, formAction, isPending] = useActionState(accionInicial, null);
  const [valores, setValores] = useState(valoresIniciales);
  const [copiado, setCopiado] = useState(false);

  const copiarPassword = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  if (estado?.success) {
    return (
      <div className="space-y-5 py-1">
        <div className="rounded-2xl border border-success/30 bg-success-soft p-4 space-y-3">
          <div className="flex items-center gap-2 text-success font-heading font-semibold text-base">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
            <h3>Tutor creado exitosamente</h3>
          </div>
          <p className="text-sm text-foreground/80">
            Se ha creado la cuenta del tutor. Copia y comparte su contraseña temporal de acceso:
          </p>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background px-3.5 py-2.5 shadow-2xs">
            <code className="font-mono text-sm font-bold tracking-wider text-foreground">
              {estado.passwordTemporal}
            </code>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => copiarPassword(estado.passwordTemporal)}
              className="gap-1.5 shrink-0"
            >
              {copiado ? (
                <>
                  <Check className="size-3.5 text-success" />
                  <span className="text-success font-semibold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Esta contraseña se muestra una sola vez. El docente deberá cambiarla en su primer inicio de sesión.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCrearOtro}>
            Crear otro tutor
          </Button>
          <Button type="button" onClick={onCerrar}>
            Listo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nombre-tutor">Nombre</Label>
        <Input
          id="nombre-tutor"
          name="nombre"
          required
          value={valores.nombre}
          onChange={(e) => setValores((prev) => ({ ...prev, nombre: e.target.value }))}
          placeholder="Ej. Carlos"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="apellido-tutor">Apellido</Label>
        <Input
          id="apellido-tutor"
          name="apellido"
          required
          value={valores.apellido}
          onChange={(e) => setValores((prev) => ({ ...prev, apellido: e.target.value }))}
          placeholder="Ej. Restrepo"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-tutor">Correo electrónico</Label>
        <Input
          id="email-tutor"
          name="email"
          type="email"
          required
          value={valores.email}
          onChange={(e) => setValores((prev) => ({ ...prev, email: e.target.value }))}
          placeholder="docente@colegio.edu.co"
        />
      </div>

      {estado && !estado.success && (
        <p className="text-sm text-destructive" role="alert">
          {estado.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-3">
        <DialogClose
          render={
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          }
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando..." : "Crear tutor"}
        </Button>
      </div>
    </form>
  );
}

/**
 * OP07: el formulario de creación de tutores vive dentro de una ventana modal
 * (Dialog), siguiendo la regla: lo que se consulta está a la vista, lo que se
 * edita detrás de un botón.
 */
export function CreateTutorForm() {
  const [abierto, setAbierto] = useState(false);
  const [version, setVersion] = useState(0);

  const manejarCambioAbierto = (nuevoAbierto: boolean) => {
    setAbierto(nuevoAbierto);
    if (!nuevoAbierto) {
      setVersion((v) => v + 1);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={manejarCambioAbierto}>
      <DialogTrigger
        render={
          <Button type="button">
            <UserPlus className="size-4" aria-hidden="true" />
            Crear tutor
          </Button>
        }
      />

      <DialogContent
        titulo="Crear nuevo tutor"
        descripcion="Registra a un docente en tu espacio y genera su credencial temporal de acceso."
      >
        <TutorFormBody
          key={version}
          onCerrar={() => setAbierto(false)}
          onCrearOtro={() => setVersion((v) => v + 1)}
        />
      </DialogContent>
    </Dialog>
  );
}
