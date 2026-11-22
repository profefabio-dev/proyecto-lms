"use client";

import { useActionState, useState } from "react";
import { Download } from "lucide-react";
import { adoptarCurso } from "@/lib/actions/adopt-course";
import { Button } from "@/components/ui/button";

const estadoInicial = null;

/**
 * US47 — el botón para tomar el curso de otro docente (23/11/2026).
 *
 * Con confirmación en dos pasos, el mismo patrón de quitar estudiantes
 * (US11) y de eliminar actividades (OP08), por una razón distinta a las
 * suyas: adoptar no destruye nada, pero crea un curso entero en "Mis
 * cursos" y conviene que no pase por un clic accidental. El segundo paso
 * dice qué va a pasar exactamente, que es lo que la gente no espera: que
 * es una copia y que nace en borrador.
 */
export function AdoptCourseForm({
  courseId,
  titulo,
  autor,
}: {
  courseId: string;
  titulo: string;
  autor: string;
}) {
  const [estado, accion, enviando] = useActionState(adoptarCurso, estadoInicial);
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <div className="space-y-2">
        <Button type="button" size="lg" onClick={() => setConfirmando(true)}>
          <Download className="size-4" aria-hidden="true" />
          Tomar este curso
        </Button>

        {estado && !estado.success && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {estado.error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-primary/40 bg-muted/40 p-4">
      <div className="space-y-2 text-sm">
        <p className="font-semibold text-foreground">
          Vas a hacer tu propia copia de “{titulo}”.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Se copian las lecciones, actividades y evaluaciones.</li>
          <li>
            <strong className="text-foreground">No</strong> se copian los estudiantes de {autor},
            ni sus entregas ni sus notas.
          </li>
          <li>
            Tu copia queda en <strong className="text-foreground">borrador</strong>, para que la
            revises y la adaptes antes de publicarla.
          </li>
          <li>El curso de {autor} no se modifica, y aparecerá acreditado en tu copia.</li>
        </ul>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={() => setConfirmando(false)}>
          Cancelar
        </Button>

        <form action={accion}>
          <input type="hidden" name="courseId" value={courseId} />
          <Button type="submit" disabled={enviando}>
            {enviando ? "Copiando el curso..." : "Sí, hacer mi copia"}
          </Button>
        </form>
      </div>

      {estado && !estado.success && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {estado.error}
        </p>
      )}
    </div>
  );
}
