import { BookOpen, Moon } from "lucide-react";
import { cambiarModoLectura } from "@/lib/actions/set-reading-mode";
import { type ModoLectura, modoOpuesto } from "@/lib/reading-mode";

/**
 * US56-A — el interruptor de modo lectura (28/11/2026).
 *
 * **Server Component a propósito.** Es un `<form>` con un campo oculto y un
 * botón: no necesita estado, no necesita `useActionState` —no hay nada que
 * mostrar mientras se guarda— y así funciona también sin JavaScript. El
 * servidor ya conoce el modo cuando pinta la lección, de modo que el botón
 * siempre ofrece el otro: no hay un instante en que diga una cosa y la
 * pantalla muestre otra.
 *
 * El texto dice a dónde lleva, no dónde está. "Modo lectura" cuando la
 * lección está oscura; "Volver al modo oscuro" cuando está clara. Un botón
 * que dice el estado actual se lee al revés la mitad de las veces.
 */
export function ReadingModeToggle({ modo }: { modo: ModoLectura }) {
  const destino = modoOpuesto(modo);
  const vaAClaro = destino === "claro";

  return (
    <form action={cambiarModoLectura}>
      <input type="hidden" name="modo" value={destino} />
      <button
        type="submit"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs transition-all hover:bg-muted/40 hover:text-foreground touch:min-h-11"
        title={
          vaAClaro
            ? "Leer sobre fondo claro, como una hoja"
            : "Volver al fondo oscuro de la plataforma"
        }
      >
        {vaAClaro ? (
          <>
            <BookOpen className="size-3.5" aria-hidden="true" />
            <span>Modo lectura</span>
          </>
        ) : (
          <>
            <Moon className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Volver al modo oscuro</span>
            <span className="sm:hidden">Modo oscuro</span>
          </>
        )}
      </button>
    </form>
  );
}
