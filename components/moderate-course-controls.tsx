"use client";

import { useActionState, useState } from "react";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import {
  alternarCursoVerificado,
  retirarCursoDelCatalogo,
} from "@/lib/actions/moderate-course";
import { Button } from "@/components/ui/button";

const estadoInicial = null;

/**
 * US49 — los controles del Super Administrador sobre un curso del catálogo
 * (24/11/2026).
 *
 * Solo se renderizan para el Super Administrador, pero eso es presentación:
 * quien manda es la comprobación de rol dentro de cada acción. Ocultar un
 * botón no es un permiso.
 *
 * **Verificar es de un clic y retirar pide confirmación**, y es a propósito:
 * poner un sello se deshace poniéndolo otra vez, mientras que retirar afecta
 * a un curso ajeno que otros docentes podrían estar a punto de adoptar.
 */
export function ModerateCourseControls({
  courseId,
  verificado,
  compartible,
}: {
  courseId: string;
  verificado: boolean;
  compartible: boolean;
}) {
  const [estadoSello, accionSello, sellando] = useActionState(
    alternarCursoVerificado,
    estadoInicial
  );
  const [estadoRetiro, accionRetiro, retirando] = useActionState(
    retirarCursoDelCatalogo,
    estadoInicial
  );
  const [confirmando, setConfirmando] = useState(false);

  const resultado = estadoSello ?? estadoRetiro;

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Administración de la plataforma
      </p>

      <div className="flex flex-wrap gap-2">
        <form action={accionSello}>
          <input type="hidden" name="courseId" value={courseId} />
          <Button type="submit" variant={verificado ? "outline" : "default"} disabled={sellando}>
            <BadgeCheck className="size-4" aria-hidden="true" />
            {sellando
              ? "Guardando..."
              : verificado
                ? "Quitar el sello de verificado"
                : "Marcar como verificado"}
          </Button>
        </form>

        {compartible && !confirmando && (
          <Button type="button" variant="outline" onClick={() => setConfirmando(true)}>
            <ShieldAlert className="size-4" aria-hidden="true" />
            Retirar del catálogo
          </Button>
        )}
      </div>

      {confirmando && (
        <div className="space-y-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm text-foreground">
            El curso deja de ofrecerse a otros docentes de inmediato.{" "}
            <strong>No se borra nada</strong>: su autor conserva el curso, sus estudiantes y sus
            notas, y puede volver a compartirlo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <form action={accionRetiro}>
              <input type="hidden" name="courseId" value={courseId} />
              <Button type="submit" variant="destructive" size="sm" disabled={retirando}>
                {retirando ? "Retirando..." : "Sí, retirar ahora"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {resultado && (
        <p
          role="status"
          className={
            resultado.success
              ? "rounded-2xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-foreground"
              : "rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {resultado.success ? resultado.mensaje : resultado.error}
        </p>
      )}
    </div>
  );
}
