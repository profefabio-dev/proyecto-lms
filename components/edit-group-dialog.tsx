"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { renombrarGrupo } from "@/lib/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

export function EditGroupDialog({
  grupoId,
  nombreActual,
}: {
  grupoId: string;
  nombreActual: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, enviando] = useActionState(renombrarGrupo, null);
  const [nombre, setNombre] = useState(nombreActual);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <Pencil className="size-3" aria-hidden="true" />
            Renombrar
          </Button>
        }
      />

      <DialogContent
        titulo={`Renombrar grupo ${nombreActual}`}
        descripcion="El nuevo nombre se actualizará en todos los estudiantes vinculados a este salón."
      >
        <form
          action={async (formData) => {
            await accion(formData);
            if (estado?.success) {
              setAbierto(false);
            }
          }}
          className="space-y-4"
        >
          <input type="hidden" name="grupoId" value={grupoId} />

          <div className="space-y-2">
            <Label htmlFor={`nombre-editar-${grupoId}`}>Nuevo nombre</Label>
            <Input
              id={`nombre-editar-${grupoId}`}
              name="nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={30}
              autoFocus
            />
          </div>

          {estado && !estado.success && (
            <p role="alert" className="text-sm text-destructive">
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
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
