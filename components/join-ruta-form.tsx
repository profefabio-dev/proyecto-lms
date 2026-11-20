"use client";

import { useActionState } from "react";
import { Route } from "lucide-react";
import { asociarseARuta } from "@/lib/actions/join-ruta";
import { Button } from "@/components/ui/button";

const estadoInicial = null;

/**
 * US44: "Asociarme a esta ruta" — el gesto que la descripción del proyecto
 * pedía desde el principio.
 *
 * Detrás, la Server Action inscribe al estudiante en los cursos publicados
 * de la ruta, así que al volver la página ya aparecen en "Mis cursos". No
 * hace falta un mensaje de éxito propio: el botón desaparece y la ruta pasa
 * a mostrar su avance.
 */
export function JoinRutaForm({ rutaId }: { rutaId: string }) {
  const [estado, accion, enviando] = useActionState(asociarseARuta, estadoInicial);

  return (
    <form action={accion} className="space-y-2">
      <input type="hidden" name="rutaId" value={rutaId} />

      <Button type="submit" size="lg" disabled={enviando} className="w-full gap-2 font-bold sm:w-auto">
        <Route className="size-4" aria-hidden="true" />
        {enviando ? "Asociando..." : "Asociarme a esta ruta"}
      </Button>

      {estado && !estado.success && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {estado.error}
        </p>
      )}
    </form>
  );
}
