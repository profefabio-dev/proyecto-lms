"use client";

import { useActionState } from "react";
import { asignarContenidoASeccion } from "@/lib/actions/assign-content-section";
import { Button } from "@/components/ui/button";

/**
 * US30: el Tutor mueve un contenido a otra sección (o lo deja "Sin
 * sección") desde un desplegable junto a cada contenido — evita tener que
 * ir sección por sección arrastrando o recreando contenido para
 * reorganizarlo.
 */
export function SectionAssignSelect({
  contentId,
  seccionIdActual,
  secciones,
}: {
  contentId: string;
  seccionIdActual: string | null;
  secciones: { id: string; titulo: string }[];
}) {
  const [estado, accion, enviando] = useActionState(asignarContenidoASeccion, null);

  if (secciones.length === 0) {
    return null;
  }

  return (
    <form action={accion} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="contentId" value={contentId} />
      {/* `key={seccionIdActual ?? "sin-seccion"}` es necesario, no cosmético:
          mismo problema que en CourseStatusSelect (OP05). React reinicia el
          <select> a su `defaultValue` al enviar el formulario, y al no ser
          un campo controlado no vuelve a aplicar un `defaultValue` nuevo
          sobre un nodo ya existente. Sin esta key, tras mover el contenido
          con éxito el desplegable se quedaba mostrando la sección anterior
          aunque el cambio sí se hubiera guardado. Con la key, en cuanto
          `seccionIdActual` cambia, React reemplaza el nodo con el valor
          correcto. */}
      <select
        key={seccionIdActual ?? "sin-seccion"}
        name="seccionId"
        defaultValue={seccionIdActual ?? ""}
        aria-label="Sección de este contenido"
        className="rounded-md border border-input bg-transparent px-2 py-1 text-xs"
      >
        <option value="">Sin sección</option>
        {secciones.map((seccion) => (
          <option key={seccion.id} value={seccion.id}>
            {seccion.titulo}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="xs" disabled={enviando}>
        Mover
      </Button>
      {estado && !estado.success && (
        <p role="alert" className="w-full text-xs text-red-600">
          {estado.error}
        </p>
      )}
    </form>
  );
}
