"use client";

import { useActionState, useState } from "react";
import { Plus, Users } from "lucide-react";
import { crearGrupo } from "@/lib/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

export function CreateGroupDialog() {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, enviando] = useActionState(crearGrupo, null);
  const [nombre, setNombre] = useState("");

  const handleOpenChange = (nuevoAbierto: boolean) => {
    setAbierto(nuevoAbierto);
    if (!nuevoAbierto) {
      setNombre("");
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" className="gap-1.5 font-semibold">
            <Plus className="size-4" aria-hidden="true" />
            Crear grupo
          </Button>
        }
      />

      <DialogContent
        titulo="Crear nuevo grupo escolar"
        descripcion="Crea un salón o sección (ej. 6A, 7B, 10-1) para organizar a tus estudiantes."
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
          <div className="space-y-2">
            <Label htmlFor="nombre-grupo">Nombre del grupo o salón</Label>
            <Input
              id="nombre-grupo"
              name="nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. 6A, 7B, Robótica-1"
              maxLength={30}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Se guardará automáticamente en mayúsculas para mantener consistencia.
            </p>
          </div>

          {estado && !estado.success && (
            <p role="alert" className="text-sm text-destructive">
              {estado.error}
            </p>
          )}

          {estado && estado.success && (
            <p className="text-sm text-success font-medium">
              {estado.mensaje}
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
            <Button type="submit" disabled={enviando} className="gap-1.5">
              <Users className="size-4" aria-hidden="true" />
              {enviando ? "Guardando..." : "Crear grupo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
