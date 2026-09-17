"use client";

import { useActionState } from "react";
import { asignarEstudiantes } from "@/lib/actions/assign-students";
import { Button } from "@/components/ui/button";
import { colorDeGrupo } from "@/lib/group-color";

const estadoInicial = null;

type Estudiante = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  // Opcional a propósito: solo lo traen los estudiantes creados por la
  // carga masiva (US29) después del 16/09/2026 — ver `lib/group-color.ts`.
  grado?: string | null;
};

// Corrección de UX (16/09/2026), pedida por el docente: "el docente tiene
// un listado de alumnos pero no puede ver a qué grupo corresponde, y
// podría no ser útil verlos a todos así, ya que muchos docentes no
// conocen completamente sus grupos". Se agrupa por grado (mismo patrón
// `<details>`/`<summary>` colapsable ya usado en la vista previa de la
// carga masiva) para que el grupo quede visible de una vez, en vez de
// tener que reconocer cada estudiante de memoria en una lista plana. Los
// estudiantes sin grado guardado (creados antes de este cambio, o a mano
// sin ese dato) caen en un grupo "Sin grado" al final.
function agruparEstudiantesPorGrado(
  estudiantes: Estudiante[]
): { grado: string; estudiantes: Estudiante[] }[] {
  const orden: string[] = [];
  const porGrado = new Map<string, Estudiante[]>();
  for (const estudiante of estudiantes) {
    const clave = (estudiante.grado ?? "").trim();
    if (!porGrado.has(clave)) {
      porGrado.set(clave, []);
      orden.push(clave);
    }
    porGrado.get(clave)!.push(estudiante);
  }
  // El grupo "Sin grado" (clave vacía) siempre al final, sin importar en
  // qué orden hayan llegado los estudiantes.
  orden.sort((a, b) => (a === "" ? 1 : b === "" ? -1 : 0));
  return orden.map((grado) => ({ grado, estudiantes: porGrado.get(grado)! }));
}

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

  const grupos = agruparEstudiantesPorGrado(estudiantes);

  return (
    // Corrección de UX (16/09/2026), pedida por el docente ("puedes usar
    // la pantalla más ancha"): antes este formulario tenía `max-w-md`
    // (~28rem), mucho más angosto que el resto de la página — se quita
    // ese límite para aprovechar el mismo ancho que ya usa el resto del
    // contenido del curso.
    <form action={accion} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />

      <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border bg-muted/10 p-2">
        {grupos.map(({ grado, estudiantes: estudiantesDelGrado }) => {
          const color = colorDeGrupo(grado);
          return (
            <details
              key={grado || "sin-grado"}
              open
              className={`space-y-1 rounded-md border-l-4 bg-card p-2 ${color.borde}`}
            >
              <summary className="cursor-pointer text-sm font-semibold">
                {grado || "Sin grado"}{" "}
                <span className="font-normal text-muted-foreground">
                  ({estudiantesDelGrado.length})
                </span>
              </summary>

              <div className="space-y-0.5">
                {estudiantesDelGrado.map((estudiante) => (
                  <label
                    key={estudiante.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      name="estudianteIds"
                      value={estudiante.id}
                      className="size-4 shrink-0 accent-primary"
                    />
                    {/* Corrección de UX (16/09/2026): además del color del
                        borde del grupo, cada fila trunca su texto a un
                        solo renglón (`truncate`) en vez de poder partirse
                        en dos líneas con nombres o correos largos —
                        "ocupa mucho espacio de pantalla" con muchos
                        estudiantes registrados. */}
                    <span className="truncate">
                      <span className="font-medium">
                        {estudiante.nombre} {estudiante.apellido}
                      </span>{" "}
                      <span className="text-muted-foreground">— {estudiante.email}</span>
                    </span>
                  </label>
                ))}
              </div>
            </details>
          );
        })}
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
