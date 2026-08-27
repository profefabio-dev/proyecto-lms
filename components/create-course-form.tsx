"use client";

import { useActionState } from "react";
import { crearCurso } from "@/lib/actions/create-course";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial = null;

export function CreateCourseForm() {
  const [estado, accion, enviando] = useActionState(crearCurso, estadoInicial);

  return (
    <form action={accion} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" name="titulo" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <textarea
          id="descripcion"
          name="descripcion"
          required
          rows={4}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="imagen">URL de la imagen</Label>
        <Input id="imagen" name="imagen" type="url" placeholder="https://..." required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="estado">Estado</Label>
        <select
          id="estado"
          name="estado"
          defaultValue="BORRADOR"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        >
          <option value="BORRADOR">Borrador</option>
          <option value="PUBLICADO">Publicado</option>
        </select>
      </div>

      <Button type="submit" disabled={enviando}>
        {enviando ? "Creando..." : "Crear curso"}
      </Button>

      {estado && !estado.success && (
        <p role="alert" className="text-red-600 text-sm">
          {estado.error}
        </p>
      )}

      {estado && estado.success && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
          <p className="font-medium text-green-800">Curso creado correctamente.</p>
        </div>
      )}
    </form>
  );
}