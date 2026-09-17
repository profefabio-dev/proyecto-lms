"use client";

import { useActionState, useState } from "react";
import {
  desinscribirEstudiantes,
  type ResultadoDesinscribir,
} from "@/lib/actions/unenroll-students";
import { Button } from "@/components/ui/button";

type Estudiante = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
};

// Pedido del docente (16/09/2026): "una vez sean asignados a un curso
// también debería dejarse eliminar porque no tienen la opción" — la
// sección "Estudiantes inscritos" solo mostraba una lista, sin ninguna
// acción. Se agrega quitar (individual o en bloque) con doble
// confirmación explícita antes de enviar el formulario, para no borrar
// por accidente — sin diálogos nativos del navegador (`confirm()`), con
// el mismo lenguaje visual del resto del proyecto.
type PasoConfirmacion = "nada" | "primera" | "segunda";

export function UnenrollStudentsForm({
  courseId,
  estudiantes,
}: {
  courseId: string;
  estudiantes: Estudiante[];
}) {
  const [estado, accion, enviando] = useActionState<ResultadoDesinscribir | null, FormData>(
    desinscribirEstudiantes,
    null
  );
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [paso, setPaso] = useState<PasoConfirmacion>("nada");

  // Mismo patrón ya usado en `bulk-import-students-form.tsx`: ajustar
  // estado durante el render al detectar un resultado nuevo de
  // `useActionState`, en vez de un `useEffect` con `setState` síncrono.
  const [ultimoEstado, setUltimoEstado] = useState(estado);
  if (estado !== ultimoEstado) {
    setUltimoEstado(estado);
    if (estado?.success) {
      setSeleccionados(new Set());
      setPaso("nada");
    }
  }

  function alternar(id: string) {
    setSeleccionados((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
    // Cambiar la selección cancela cualquier confirmación en curso, para
    // no terminar confirmando el borrado de una lista distinta a la que
    // se ve en pantalla.
    setPaso("nada");
  }

  return (
    <div className="space-y-2">
      <ul className="max-h-72 space-y-0.5 overflow-y-auto text-sm">
        {estudiantes.map((estudiante) => (
          <li key={estudiante.id}>
            <label className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted">
              <input
                type="checkbox"
                checked={seleccionados.has(estudiante.id)}
                onChange={() => alternar(estudiante.id)}
                className="size-4 shrink-0 accent-primary"
              />
              <span className="truncate">
                {estudiante.nombre} {estudiante.apellido}{" "}
                <span className="text-muted-foreground">— {estudiante.email}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {seleccionados.size > 0 && paso === "nada" && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setPaso("primera")}
        >
          Quitar {seleccionados.size} estudiante(s) del curso
        </Button>
      )}

      {paso === "primera" && (
        <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p>
            ¿Seguro que quieres quitar a {seleccionados.size} estudiante(s) de este curso? Se
            pierde su inscripción y su progreso en este curso — su cuenta y su historial en
            otros cursos no se ven afectados.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="destructive" size="sm" onClick={() => setPaso("segunda")}>
              Sí, continuar
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setPaso("nada")}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {paso === "segunda" && (
        <form
          action={accion}
          className="space-y-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm"
        >
          <input type="hidden" name="courseId" value={courseId} />
          {[...seleccionados].map((id) => (
            <input key={id} type="hidden" name="estudianteIds" value={id} />
          ))}
          <p className="font-medium">Esta acción no se puede deshacer. ¿Confirmas de nuevo?</p>
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" size="sm" disabled={enviando}>
              {enviando ? "Quitando..." : "Sí, quitar definitivamente"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaso("nada")}
              disabled={enviando}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {estado && !estado.success && (
        <p role="alert" className="text-sm text-red-600">
          {estado.error}
        </p>
      )}

      {estado && estado.success && (
        <p className="text-sm text-green-700">
          {estado.quitados} estudiante(s) quitado(s) del curso.
        </p>
      )}
    </div>
  );
}
