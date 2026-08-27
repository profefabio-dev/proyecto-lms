"use client";

import { useActionState } from "react";
import { crearEstudiante } from "@/lib/actions/create-student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial = null;

export function CreateStudentForm() {
  const [estado, accion, enviando] = useActionState(crearEstudiante, estadoInicial);

  return (
    <form action={accion} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="apellido">Apellido</Label>
        <Input id="apellido" name="apellido" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>

      <Button type="submit" disabled={enviando}>
        {enviando ? "Creando..." : "Crear estudiante"}
      </Button>

      {estado && !estado.success && (
        <p role="alert" className="text-red-600 text-sm">
          {estado.error}
        </p>
      )}

      {estado && estado.success && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
          <p className="font-medium text-green-800">Estudiante creado correctamente.</p>
          <p>
            Contraseña temporal: <code>{estado.passwordTemporal}</code>
          </p>
          <p className="text-xs text-green-700 mt-1">
            Comparte esta contraseña con el estudiante de forma segura; debería cambiarla en su primer inicio de sesión.
          </p>
        </div>
      )}
    </form>
  );
}