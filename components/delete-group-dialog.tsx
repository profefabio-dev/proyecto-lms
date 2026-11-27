"use client";

import { useActionState, useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { eliminarGrupo } from "@/lib/actions/groups";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

export function DeleteGroupDialog({
  grupoId,
  nombreGrupo,
  totalEstudiantes,
}: {
  grupoId: string;
  nombreGrupo: string;
  totalEstudiantes: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, enviando] = useActionState(eliminarGrupo, null);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-xs text-destructive hover:bg-destructive/10 gap-1"
          >
            <Trash2 className="size-3" aria-hidden="true" />
            Eliminar
          </Button>
        }
      />

      <DialogContent
        titulo={`Eliminar grupo ${nombreGrupo}`}
        descripcion="Confirma si deseas eliminar este grupo escolar."
      >
        <form
          action={async (formData) => {
            await accion(formData);
            setAbierto(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="grupoId" value={grupoId} />

          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              <span>Acción permanente</span>
            </div>
            <p className="text-foreground/80 leading-relaxed">
              ¿Estás seguro de que deseas eliminar el grupo <strong>{nombreGrupo}</strong>?
            </p>
            {totalEstudiantes > 0 && (
              <p className="text-xs text-muted-foreground">
                Los <strong>{totalEstudiantes} estudiantes</strong> asociados a este grupo <strong>no se borrarán</strong>; simplemente quedarán sin grupo asignado.
              </p>
            )}
          </div>

          {estado && !estado.success && (
            <p role="alert" className="text-sm text-destructive">
              {estado.error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              }
            />
            <Button type="submit" variant="destructive" disabled={enviando}>
              {enviando ? "Eliminando..." : "Sí, eliminar grupo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
