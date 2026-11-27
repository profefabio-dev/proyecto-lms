"use client";

import { useActionState, useState } from "react";
import { Flag, ShieldAlert, CheckCircle2 } from "lucide-react";
import { reportarCurso } from "@/lib/actions/report-course";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";

const MOTIVOS = [
  "Contenido inapropiado para menores de edad",
  "Lenguaje ofensivo, discriminatorio o violento",
  "Vulneración de privacidad o exposición de datos personales",
  "Material con derechos de autor o copia no autorizada",
  "Información engañosa, falsa o spam",
  "Otro motivo",
];

export function ReportCourseDialog({ courseId }: { courseId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, enviando] = useActionState(reportarCurso, null);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [detalles, setDetalles] = useState("");

  const handleOpenChange = (nuevoAbierto: boolean) => {
    setAbierto(nuevoAbierto);
    if (!nuevoAbierto) {
      setDetalles("");
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
          >
            <Flag className="size-3.5" aria-hidden="true" />
            Reportar curso
          </Button>
        }
      />

      <DialogContent
        titulo="Reportar curso"
        descripcion="Ayúdanos a mantener un entorno seguro y de calidad para docentes y estudiantes menores de edad."
      >
        {estado?.success ? (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-success/30 bg-success-soft p-4 space-y-2">
              <div className="flex items-center gap-2 text-success font-heading font-semibold text-base">
                <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
                <h3>Reporte enviado</h3>
              </div>
              <p className="text-sm text-foreground/80">
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
              <Label htmlFor="motivo-reporte">Motivo del reporte</Label>
              <Select
                id="motivo-reporte"
                name="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
              >
                {MOTIVOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="detalles-reporte">Detalles adicionales (opcional)</Label>
              <Textarea
                id="detalles-reporte"
                name="detalles"
                value={detalles}
                onChange={(e) => setDetalles(e.target.value)}
                rows={3}
                placeholder="Explica brevemente por qué este material no debería circular en el catálogo..."
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
              <Button type="submit" variant="destructive" disabled={enviando} className="gap-1.5">
                <ShieldAlert className="size-4" aria-hidden="true" />
                {enviando ? "Enviando..." : "Enviar reporte"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
