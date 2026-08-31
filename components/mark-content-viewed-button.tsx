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
    return <Badge variant="success">✓ Visto</Badge>;
  }

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="contentId" value={contentId} />
      <Button type="submit" size="xs" variant="outline" disabled={isPending}>
        {isPending ? "Guardando..." : "Marcar como visto"}
      </Button>
      {estado && !estado.success && (
        <span className="text-xs text-red-600" role="alert">
          {estado.error}
        </span>
      )}
    </form>
  );
}
