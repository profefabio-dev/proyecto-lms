"use client";

import { useActionState } from "react";
import { crearSeccion } from "@/lib/actions/create-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial = null;

export function CreateSectionForm({ courseId }: { courseId: string }) {
  const [estado, accion, enviando] = useActionState(crearSeccion, estadoInicial);

  return (
    <form action={accion} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <input type="hidden" name="courseId" value={courseId} />

      <div className="min-w-48 flex-1 space-y-2">
        <Label htmlFor="titulo-seccion">Título de la sección</Label>
        <Input id="titulo-seccion" name="titulo" placeholder="Ej. Semana 1" required />
      </div>

      <Button type="submit" disabled={enviando}>
        {enviando ? "Creando..." : "Crear sección"}
      </Button>

      {estado && !estado.success && (
        <p role="alert" className="w-full text-sm text-red-600">
          {estado.error}
        </p>
      )}
    </form>
  );
}
