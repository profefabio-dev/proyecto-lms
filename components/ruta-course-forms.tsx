"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { agregarCursoARuta } from "@/lib/actions/add-course-to-ruta";
import { quitarCursoDeRuta } from "@/lib/actions/remove-course-from-ruta";
import { cambiarEstadoRuta } from "@/lib/actions/toggle-ruta-estado";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

/**
 * US44 — los tres controles que el Tutor usa sobre una ruta, juntos en un
 * archivo porque los tres son el mismo gesto mínimo (un formulario de una
 * línea sobre la misma ruta) y separarlos en tres archivos de 40 líneas no
 * aportaría nada.
 */

const estadoInicial = null;

export function AddCourseToRutaForm({
  rutaId,
  cursosDisponibles,
}: {
  rutaId: string;
  cursosDisponibles: { id: string; titulo: string; estado: string }[];
}) {
  const [estado, accion, enviando] = useActionState(agregarCursoARuta, estadoInicial);
  const [courseId, setCourseId] = useState("");

  // Igual que en los demás formularios del proyecto: el campo es controlado
  // porque React vacía el formulario en cada envío, también cuando falla.
  const [estadoYaVisto, setEstadoYaVisto] = useState(estado);
  if (estado !== estadoYaVisto) {
    setEstadoYaVisto(estado);
    if (estado?.success) {
      setCourseId("");
    }
  }

  if (cursosDisponibles.length === 0) {
    return (
      <p className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
        Todos tus cursos ya están en esta ruta. Crea un curso nuevo para seguir ampliándola.
      </p>
    );
  }

  return (
    <form action={accion} className="space-y-3">
      <input type="hidden" name="rutaId" value={rutaId} />

      <div className="space-y-2">
        <Label htmlFor="curso-ruta">Agregar un curso al final de la ruta</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            id="curso-ruta"
            name="courseId"
            required
            value={courseId}
            onChange={(evento) => setCourseId(evento.target.value)}
            className="sm:flex-1"
          >
            <option value="">Selecciona un curso...</option>
            {cursosDisponibles.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.titulo}
                {curso.estado !== "PUBLICADO" ? ` (${curso.estado.toLowerCase()})` : ""}
              </option>
            ))}
          </Select>

          <Button type="submit" disabled={enviando} className="gap-2">
            <Plus className="size-4" aria-hidden="true" />
            {enviando ? "Agregando..." : "Agregar"}
          </Button>
        </div>
      </div>

      {estado && !estado.success && (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {estado.error}
        </p>
      )}

      {estado?.success && estado.inscritosNuevos > 0 && (
        <p className="rounded-2xl border border-success-border bg-success-soft px-3 py-2 text-sm text-success">
          Curso agregado. Se inscribió a {estado.inscritosNuevos}{" "}
          {estado.inscritosNuevos === 1 ? "estudiante" : "estudiantes"} que ya venía recorriendo la
          ruta.
        </p>
      )}
    </form>
  );
}

export function RemoveCourseFromRutaForm({
  rutaId,
  courseId,
  tituloCurso,
}: {
  rutaId: string;
  courseId: string;
  tituloCurso: string;
}) {
  const [estado, accion, enviando] = useActionState(quitarCursoDeRuta, estadoInicial);

  return (
    <form action={accion} className="inline-flex items-center gap-2">
      <input type="hidden" name="rutaId" value={rutaId} />
      <input type="hidden" name="courseId" value={courseId} />

      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={enviando}
        className="gap-1.5 text-destructive hover:bg-destructive/10"
        aria-label={`Quitar ${tituloCurso} de la ruta`}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        {enviando ? "Quitando..." : "Quitar"}
      </Button>

      {estado && !estado.success && (
        <span role="alert" className="text-xs text-destructive">
          {estado.error}
        </span>
      )}
    </form>
  );
}

export function ToggleRutaEstadoForm({
  rutaId,
  publicada,
}: {
  rutaId: string;
  publicada: boolean;
}) {
  const [estado, accion, enviando] = useActionState(cambiarEstadoRuta, estadoInicial);

  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="rutaId" value={rutaId} />

      <Button type="submit" variant={publicada ? "outline" : "default"} disabled={enviando} className="gap-2">
        {publicada ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
        {enviando ? "Guardando..." : publicada ? "Despublicar" : "Publicar ruta"}
      </Button>

      {estado && !estado.success && (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {estado.error}
        </p>
      )}
    </form>
  );
}
