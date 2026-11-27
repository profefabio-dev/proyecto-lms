"use client";

import { useActionState, useState } from "react";
import { Users, UserCheck } from "lucide-react";
import { matricularGrupoEnCurso } from "@/lib/actions/groups";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

interface GrupoOpcion {
  id: string;
  nombre: string;
  totalEstudiantes: number;
}

export function EnrollGroupDialog({
  courseId,
  grupos,
}: {
  courseId: string;
  grupos: GrupoOpcion[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, enviando] = useActionState(matricularGrupoEnCurso, null);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(grupos[0]?.id || "");

  if (grupos.length === 0) {
    return null;
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="gap-1.5 font-semibold text-xs rounded-2xl">
            <Users className="size-3.5 text-primary" aria-hidden="true" />
            Matricular grupo escolar
          </Button>
        }
      />

      <DialogContent
        titulo="Matricular grupo escolar completo"
        descripcion="Inscribe a todos los estudiantes activos de un salón a este curso en un solo clic."
      >
        {estado?.success ? (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-success/30 bg-success-soft p-4 space-y-2">
              <div className="flex items-center gap-2 text-success font-heading font-semibold text-base">
                <UserCheck className="size-5 shrink-0" aria-hidden="true" />
                <h3>Matrícula completada</h3>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {estado.mensaje}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" onClick={() => setAbierto(false)}>
                Listo
              </Button>
            </div>
          </div>
        ) : (
          <form action={accion} className="space-y-4">
            <input type="hidden" name="courseId" value={courseId} />

            <div className="space-y-2">
              <Label htmlFor="select-grupo-matricular">Selecciona el grupo o salón</Label>
              <Select
                id="select-grupo-matricular"
                name="grupoId"
                value={grupoSeleccionado}
                onChange={(e) => setGrupoSeleccionado(e.target.value)}
                required
              >
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre} ({g.totalEstudiantes} {g.totalEstudiantes === 1 ? "alumno" : "alumnos"})
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Los alumnos que ya estén inscritos no se duplicarán; solo se incorporarán los que falten.
              </p>
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
              <Button type="submit" disabled={enviando} className="gap-1.5">
                <Users className="size-4" aria-hidden="true" />
                {enviando ? "Matriculando..." : "Matricular salón completo"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
