"use client";

import { useActionState } from "react";
import { cambiarEstadoCurso } from "@/lib/actions/change-course-status";
import { Button } from "@/components/ui/button";

const ETIQUETAS_ESTADO: Record<string, string> = {
  BORRADOR: "Borrador",
  PUBLICADO: "Publicado",
  ARCHIVADO: "Archivado",
};

/**
 * Corrección sobre US07/US14: el Tutor ahora puede cambiar el estado de un
 * curso ya creado (por ejemplo, de Borrador a Publicado) sin tener que
 * volver a ingresar título, descripción ni imagen, como antes de este
 * cambio no era posible.
 */
export function CourseStatusSelect({
  courseId,
  estadoActual,
}: {
  courseId: string;
  estadoActual: string;
}) {
  const [estado, accion, enviando] = useActionState(cambiarEstadoCurso, null);

  return (
    <form action={accion} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="courseId" value={courseId} />
      {/* `key={estadoActual}` es necesario, no cosmético: React reinicia el
          <select> a su `defaultValue` apenas se envía el formulario (antes
          de que la Server Action responda), y luego, al no ser un campo
          controlado, no vuelve a aplicar un `defaultValue` nuevo sobre un
          nodo que ya existe. Sin esta key, tras guardar con éxito el
          desplegable se quedaba mostrando el estado anterior aunque el
          cambio sí se hubiera guardado en la base de datos — exactamente lo
          que reportó el docente ("queda igual, no se toma el cambio"). Con
          la key, en cuanto `estadoActual` cambia (curso ya actualizado),
          React reemplaza el nodo por uno nuevo con el valor correcto. */}
      <select
        key={estadoActual}
        name="estado"
        defaultValue={estadoActual}
        aria-label="Estado del curso"
        className="rounded-md border border-input bg-transparent px-2 py-1 text-sm"
      >
        {Object.entries(ETIQUETAS_ESTADO).map(([valor, etiqueta]) => (
          <option key={valor} value={valor}>
            {etiqueta}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="sm" disabled={enviando}>
        {enviando ? "Guardando..." : "Cambiar estado"}
      </Button>
      {estado && !estado.success && (
        <p role="alert" className="w-full text-xs text-red-600">
          {estado.error}
        </p>
      )}
    </form>
  );
}
