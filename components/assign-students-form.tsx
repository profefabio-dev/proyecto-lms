"use client";

import { useActionState } from "react";
import { asignarEstudiantes } from "@/lib/actions/assign-students";
import { Button } from "@/components/ui/button";

const estadoInicial = null;

type Estudiante = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
};

export function AssignStudentsForm({
  courseId,
  estudiantes,
}: {
  courseId: string;
  estudiantes: Estudiante[];
}) {
  const [estado, accion, enviando] = useActionState(asignarEstudiantes, estadoInicial);

  if (estudiantes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todos los estudiantes registrados ya están inscritos en este curso.
      </p>
    );
  }

  return (
    <form action={accion} className="space-y-4 max-w-md">
      <input type="hidden" name="courseId" value={courseId} />

      <div className="space-y-1 rounded-lg border p-2">
        {estudiantes.map((estudiante) => (
          <label
            key={estudiante.id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <input
              type="checkbox"
              name="estudianteIds"
              value={estudiante.id}
              className="size-4 accent-primary"
            />
            <span className="font-medium">
              {estudiante.nombre} {estudiante.apellido}
            </span>
            <span className="text-muted-foreground">— {estudiante.email}</span>
          </label>
        ))}
      </div>

      <Button type="submit" disabled={enviando}>
        {enviando ? "Asignando..." : "Asignar seleccionados"}
      </Button>

      {estado && !estado.success && (
        <p role="alert" className="text-red-600 text-sm">
          {estado.error}
        </p>
      )}

      {estado && estado.success && (
        <p className="text-green-700 text-sm">
          {estado.asignados} estudiante(s) asignado(s) correctamente.
        </p>
      )}
    </form>
  );
}