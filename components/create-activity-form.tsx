"use client";

import { useActionState, useState } from "react";
import { ClipboardList } from "lucide-react";
import { crearActividad } from "@/lib/actions/create-activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

const estadoInicial = null;

export function CreateActivityForm({
  courseId,
  secciones,
}: {
  courseId: string;
  secciones: { id: string; titulo: string }[];
}) {
  const [estado, accion, enviando] = useActionState(crearActividad, estadoInicial);
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
          <Button type="button">
            <ClipboardList className="size-4" aria-hidden="true" />
            Crear actividad
          </Button>
        }
      />

      <DialogContent
        titulo="Crear actividad"
        descripcion="Los estudiantes inscritos podrán entregarla y tú calificarla."
      >
        <form action={accion} className="space-y-5">
          <input type="hidden" name="courseId" value={courseId} />

          <div className="space-y-2">
            <Label htmlFor="titulo-actividad">Título</Label>
            <Input id="titulo-actividad" name="titulo" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion-actividad">Descripción corta (opcional)</Label>
            <Input id="descripcion-actividad" name="descripcion" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instrucciones">Instrucciones</Label>
            <Textarea
              id="instrucciones"
              name="instrucciones"
              required
              rows={8}
              placeholder={
                "## Qué deben hacer\n\n- Paso uno\n- Paso dos\n\n**Entrega:** un documento o una foto del cuaderno."
              }
            />
            <p className="text-xs text-muted-foreground">
              Admite Markdown: ## para títulos, **texto** para negrita y - para listas.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="puntajeMaximo">Puntaje máximo</Label>
              <Input
                id="puntajeMaximo"
                name="puntajeMaximo"
                type="number"
                min={1}
                max={1000}
                defaultValue={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaLimite">Fecha límite (opcional)</Label>
              <Input id="fechaLimite" name="fechaLimite" type="datetime-local" />
              <p className="text-xs text-muted-foreground">
                Lo que llegue después se marca <strong>fuera de plazo</strong>, pero se recibe.
              </p>
            </div>
          </div>

          {/* US52 (25/11/2026): las dos opciones que antes decidía el código
              y no el docente. Van juntas y debajo de lo básico, porque la
              mayoría de las actividades no las necesita — es el patrón de
              "parámetros avanzados" que usa la plataforma del colegio. */}
          <div className="grid gap-4 rounded-2xl border border-dashed border-border bg-muted/20 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fechaCierre">Cerrar la entrega (opcional)</Label>
              <Input id="fechaCierre" name="fechaCierre" type="datetime-local" />
              <p className="text-xs text-muted-foreground">
                Desde esta fecha <strong>ya no se puede entregar</strong>. Si la dejas vacía, se
                recibe siempre, por tarde que sea.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoEntrega">Cómo se entrega</Label>
              <Select id="tipoEntrega" name="tipoEntrega" defaultValue="AMBOS">
                <option value="AMBOS">Texto, archivo o las dos cosas</option>
                <option value="SOLO_TEXTO">Solo escribiendo la respuesta</option>
                <option value="SOLO_ARCHIVO">Solo adjuntando un archivo</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                Útil cuando la consigna es una sola: “sube la foto del circuito” o “escribe tu
                conclusión”.
              </p>
            </div>
          </div>

          {secciones.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="seccionId">Sección (opcional)</Label>
              <Select id="seccionId" name="seccionId" defaultValue="">
                <option value="">Sin sección</option>
                {secciones.map((seccion) => (
                  <option key={seccion.id} value={seccion.id}>
                    {seccion.titulo}
                  </option>
                ))}
              </Select>
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
              {enviando ? "Creando..." : "Crear actividad"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
