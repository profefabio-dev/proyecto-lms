"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { crearCurso } from "@/lib/actions/create-course";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

const estadoInicial = null;

const valoresIniciales = { titulo: "", descripcion: "", imagenUrl: "", estado: "BORRADOR" };

export function CreateCourseForm() {
  const [estado, accion, enviando] = useActionState(crearCurso, estadoInicial);

  // El formulario vive dentro de un diálogo (rediseño de 2026-11): la
  // pantalla abre mostrando la cuadrícula de cursos, y el formulario
  // aparece solo cuando el tutor pulsa "Crear curso".
  const [abierto, setAbierto] = useState(false);

  // Los campos de texto son controlados a propósito: React vacía el
  // formulario en cada envío (incluso cuando el servidor lo rechaza por un
  // error de validación), así que sin este estado propio el docente tendría
  // que volver a escribir todo tras cada error, como reportó que le pasó.
  // El archivo de imagen no se puede conservar así (por seguridad, ningún
  // navegador permite reasignarle un archivo a un input mediante código),
  // así que ese sí hay que volver a seleccionarlo si hubo un error.
  const [valores, setValores] = useState(valoresIniciales);
  // Ajuste de estado durante el render (no en un efecto, siguiendo el
  // patrón recomendado por React para "reaccionar" a un cambio de prop):
  // en cuanto `estado` pasa a éxito, se limpia el formulario para el
  // siguiente curso y se cierra el diálogo. No se muestra un mensaje de
  // "curso creado": el curso nuevo aparece enseguida en la cuadrícula de
  // atrás (por el `revalidatePath` de la Server Action), que es una
  // confirmación más clara que un texto en un formulario ya cerrado.
  const [estadoYaLimpiado, setEstadoYaLimpiado] = useState(estado);
  if (estado !== estadoYaLimpiado) {
    setEstadoYaLimpiado(estado);
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
            Crear curso
          </Button>
        }
      />

      <DialogContent
        titulo="Crear curso"
        descripcion="Queda guardado como borrador hasta que lo publiques."
      >
        <form action={accion} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              name="titulo"
              required
              value={valores.titulo}
              onChange={(evento) =>
                setValores((actuales) => ({ ...actuales, titulo: evento.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              name="descripcion"
              required
              rows={4}
              value={valores.descripcion}
              onChange={(evento) =>
                setValores((actuales) => ({ ...actuales, descripcion: evento.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imagenArchivo">Imagen del curso</Label>
            <Input
              id="imagenArchivo"
              name="imagenArchivo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
            <p className="text-xs text-muted-foreground">
              JPG, PNG o WEBP, máx. 5 MB. Si hay un error al crear el curso deberás volver a
              seleccionar el archivo (el navegador no permite conservarlo), pero el resto de los
              datos no se pierde.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imagenUrl">URL de la imagen</Label>
            <Input
              id="imagenUrl"
              name="imagenUrl"
              type="url"
              placeholder="https://..."
              value={valores.imagenUrl}
              onChange={(evento) =>
                setValores((actuales) => ({ ...actuales, imagenUrl: evento.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Opcional si ya subiste un archivo arriba.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Select
              id="estado"
              name="estado"
              value={valores.estado}
              onChange={(evento) =>
                setValores((actuales) => ({ ...actuales, estado: evento.target.value }))
              }
            >
              <option value="BORRADOR">Borrador</option>
              <option value="PUBLICADO">Publicado</option>
            </Select>
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
              {enviando ? "Creando..." : "Crear curso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
