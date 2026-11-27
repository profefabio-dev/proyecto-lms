"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { crearSeccion } from "@/lib/actions/create-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

const estadoInicial = null;

// Crear sección pasó a una ventana (19/11/2026). Antes el formulario vivía
// abierto al final de la lista de secciones: después de crear una, el campo
// seguía ahí con el texto escrito y sin ninguna señal de que la sección ya
// existía, así que era fácil darle otra vez y terminar con dos secciones
// iguales — le pasó al docente con "Periodo 1". Ahora la ventana se cierra
// al crearla y la sección nueva aparece en la lista: esa es la confirmación.
export function CreateSectionForm({ courseId }: { courseId: string }) {
  const [estado, accion, enviando] = useActionState(crearSeccion, estadoInicial);
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
            <Plus className="size-4" aria-hidden="true" />
            Crear sección
          </Button>
        }
      />

      <DialogContent
        titulo="Crear sección"
        descripcion="Un módulo o semana para agrupar las lecciones del curso."
      >
        <form action={accion} className="space-y-5">
          <input type="hidden" name="courseId" value={courseId} />

          <div className="space-y-2">
            <Label htmlFor="titulo-seccion">Título de la sección</Label>
            <Input id="titulo-seccion" name="titulo" placeholder="Ej. Semana 1" required />
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
              {enviando ? "Creando..." : "Crear sección"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
