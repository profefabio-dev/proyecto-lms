"use client";

import { useActionState } from "react";
import { crearEspacio } from "@/lib/actions/create-espacio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EstadoAccion =
  | { success: true; passwordTemporal: string }
  | { success: false; error: string }
  | null;

async function accionInicial(_prevState: EstadoAccion, formData: FormData) {
  return crearEspacio(formData);
}

export function CreateEspacioForm() {
  const [estado, formAction, isPending] = useActionState(accionInicial, null);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="nombreEspacio">Nombre del espacio (docente o institución)</Label>
        <Input id="nombreEspacio" name="nombreEspacio" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre del Administrador</Label>
        <Input id="nombre" name="nombre" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="apellido">Apellido del Administrador</Label>
        <Input id="apellido" name="apellido" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico del Administrador</Label>
        <Input id="email" name="email" type="email" required />
      </div>

      {estado && !estado.success && (
        <p className="text-sm text-red-600" role="alert">
          {estado.error}
        </p>
      )}

      {estado && estado.success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          Espacio creado. Contraseña temporal del Administrador (compártela de forma segura):{" "}
          <code className="font-mono font-semibold">{estado.passwordTemporal}</code>
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creando..." : "Crear espacio"}
      </Button>
    </form>
  );
}
