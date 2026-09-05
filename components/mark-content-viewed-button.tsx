"use client";

import { useActionState } from "react";
import { marcarContenidoVisto } from "@/lib/actions/mark-content-viewed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type EstadoAccion = { success: true } | { success: false; error: string } | null;

async function accionInicial(_prevState: EstadoAccion, formData: FormData) {
  return marcarContenidoVisto(formData);
}

export function MarkContentViewedButton({
  contentId,
  visto,
}: {
  contentId: string;
  visto: boolean;
}) {
  const [estado, formAction, isPending] = useActionState(accionInicial, null);

  // `visto` viene del servidor (ya estaba marcado en cargas anteriores);
  // `estado?.success` cubre el caso de que se acabe de marcar en esta
  // misma carga, antes de que revalidatePath refresque la página.
  if (visto || estado?.success) {
    return (
      <Badge variant="success" className="px-3 py-1 text-sm">
        ✓ Visto
      </Badge>
    );
  }

  // Tamaño de botón subido de `xs` a `sm` (US31, cuarta vuelta, 05/09/2026):
  // en las tarjetas de contenido, ahora bastante más grandes, un botón
  // diminuto se veía fuera de proporción con el resto.
  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="contentId" value={contentId} />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? "Guardando..." : "Marcar como visto"}
      </Button>
      {estado && !estado.success && (
        <span className="text-sm text-red-600" role="alert">
          {estado.error}
        </span>
      )}
    </form>
  );
}
