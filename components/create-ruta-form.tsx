"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { crearRuta } from "@/lib/actions/create-ruta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

const estadoInicial = null;
const valoresIniciales = { titulo: "", descripcion: "" };

/**
 * US44: crear una ruta de aprendizaje, con el mismo patrón que
 * `CreateCourseForm` — diálogo, campos controlados (React vacía el
 * formulario en cada envío, también cuando el servidor lo rechaza) y cierre
 * automático al crear: la confirmación es que la ruta aparece en la lista
 * de atrás, no un mensaje en un formulario ya cerrado.
 */
export function CreateRutaForm() {
  const [estado, accion, enviando] = useActionState(crearRuta, estadoInicial);
  const [abierto, setAbierto] = useState(false);
  const [valores, setValores] = useState(valoresIniciales);

  const [estadoYaVisto, setEstadoYaVisto] = useState(estado);
  if (estado !== estadoYaVisto) {
    setEstadoYaVisto(estado);
    if (estado?.success) {
      setValores(valoresIniciales);
      setAbierto(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger
        render={
          <Button type="button">
            <Plus className="size-4" aria-hidden="true" />
            Crear ruta
          </Button>
        }
      />

      <DialogContent
        titulo="Crear ruta de aprendizaje"
        descripcion="Una secuencia de cursos que el estudiante recorre en orden. Queda en borrador hasta que la publiques."
      >
        <form action={accion} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="titulo-ruta">Título de la ruta</Label>
            <Input
              id="titulo-ruta"
              name="titulo"
              required
              placeholder="Ej. Tecnología 7°: de la informática básica a la robótica"
              value={valores.titulo}
              onChange={(evento) =>
                setValores((actuales) => ({ ...actuales, titulo: evento.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion-ruta">¿Qué va a lograr el estudiante?</Label>
            <Textarea
              id="descripcion-ruta"
              name="descripcion"
              required
              rows={4}
              value={valores.descripcion}
              onChange={(evento) =>
                setValores((actuales) => ({ ...actuales, descripcion: evento.target.value }))
              }
            />
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
              {enviando ? "Creando..." : "Crear ruta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
