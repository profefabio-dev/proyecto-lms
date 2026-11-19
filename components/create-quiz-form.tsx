"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { ListChecks } from "lucide-react";
import { crearQuiz } from "@/lib/actions/create-quiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

const estadoInicial = null;

export function CreateQuizForm({
  courseId,
  secciones,
}: {
  courseId: string;
  secciones: { id: string; titulo: string }[];
}) {
  const [estado, accion, enviando] = useActionState(crearQuiz, estadoInicial);
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();

  // Al crearse, el quiz todavía no tiene preguntas, así que lo útil no es
  // volver a la página del curso sino entrar directo a cargarlas.
  const [estadoYaVisto, setEstadoYaVisto] = useState(estado);
  if (estado !== estadoYaVisto) {
    setEstadoYaVisto(estado);
    if (estado?.success) {
      setAbierto(false);
      router.push(`/tutor/cursos/${courseId}/quizzes/${estado.quizId}`);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline">
            <ListChecks className="size-4 text-duo-blue" aria-hidden="true" />
            Crear evaluación
          </Button>
        }
      />

      <DialogContent
        titulo="Crear evaluación"
        descripcion="Preguntas de opción múltiple que se califican solas. Después le agregas las preguntas."
      >
        <form action={accion} className="space-y-5">
          <input type="hidden" name="courseId" value={courseId} />

          <div className="space-y-2">
            <Label htmlFor="titulo-quiz">Título</Label>
            <Input id="titulo-quiz" name="titulo" required placeholder="Ej. Repaso de la unidad 1" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion-quiz">Descripción (opcional)</Label>
            <Input id="descripcion-quiz" name="descripcion" />
          </div>

          {secciones.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="seccionId-quiz">Sección (opcional)</Label>
              <Select id="seccionId-quiz" name="seccionId" defaultValue="">
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
              {enviando ? "Creando..." : "Crear y agregar preguntas"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
