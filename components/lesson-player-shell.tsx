"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Maximize2, Minimize2, ArrowLeft, Trophy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type ModoLectura, claseDeLaHoja } from "@/lib/reading-mode";

export function LessonPlayerShell({
  header,
  content,
  navigation,
  sidebar,
  tituloLeccion,
  numeroLeccion,
  totalLecciones,
  progreso,
  yaVista,
  hrefAnterior,
  tituloAnterior,
  botonCompletar,
  modoLectura,
  controlDeLectura,
}: {
  header: React.ReactNode;
  content: React.ReactNode;
  navigation: React.ReactNode;
  sidebar: React.ReactNode;
  tituloLeccion: string;
  numeroLeccion: number;
  totalLecciones: number;
  progreso: number;
  yaVista: boolean;
  hrefAnterior: string | null;
  tituloAnterior: string | null;
  botonCompletar: React.ReactNode;
  /**
   * US56-A (28/11/2026): el modo que eligio el estudiante, leido de la
   * cookie por el servidor. Llega como prop y no como estado del cliente:
   * asi la leccion ya sale pintada del servidor con el modo correcto, sin
   * parpadeo y sin un `setState` dentro de un `useEffect` — el error de
   * eslint que este mismo archivo tuvo el 26/11.
   */
  modoLectura: ModoLectura;
  /** El interruptor, que es un Server Component con su propio `<form>`. */
  controlDeLectura: React.ReactNode;
}) {
  const [modoEnfoque, setModoEnfoque] = useState(false);

  // Si el estudiante completó el 100 % del curso en esta visita, se dispara
  // el confeti de celebración.
  //
  // Corrección (26/11/2026): este efecto llamaba a `setCelebrado(true)` de
  // forma sincrónica, que es un error de eslint
  // (`react-hooks/set-state-in-effect`) y rompe `npm run lint` — el mismo
  // tropiezo ya corregido en `bulk-import-students-form.tsx` (15/09) y en
  // `add-question-form.tsx` (19/11). Ese estado además era redundante: el
  // `sessionStorage` de abajo ya garantiza que el confeti se dispare una
  // sola vez por sesión, que es precisamente lo que se quería. Quitarlo
  // deja el efecto haciendo solo lo que un efecto debe hacer — hablar con
  // algo de afuera — sin ningún cambio de comportamiento.
  useEffect(() => {
    if (progreso === 100) {
      const clave = `curso-completado-confetti:${numeroLeccion}-${totalLecciones}`;
      if (!sessionStorage.getItem(clave)) {
        sessionStorage.setItem(clave, "1");
        import("canvas-confetti").then(({ default: confetti }) => {
          confetti({
            particleCount: 80,
            spread: 90,
            origin: { y: 0.6 },
            colors: ["#6366f1", "#10b981", "#f59e0b", "#06b6d4"],
          });
        });
      }
    }
  }, [progreso, numeroLeccion, totalLecciones]);

  return (
    <div className="relative pb-24">
      {/* Barra de Controles Superiores: Modo Enfoque / Cine */}
      <div className="flex items-center justify-between pb-4 mb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold">
            Lección {numeroLeccion} de {totalLecciones}
          </Badge>
          {yaVista && (
            <Badge variant="success" className="text-xs font-semibold">
              Completada
            </Badge>
          )}
        </div>

        {/* Los dos controles de cómo se VE la lección, juntos: el modo de
            lectura (US56-A, 28/11/2026) y el modo enfoque. */}
        <div className="flex items-center gap-2">
          {controlDeLectura}

          <button
            type="button"
            onClick={() => setModoEnfoque((prev) => !prev)}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-semibold shadow-xs transition-all",
              modoEnfoque
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/80 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
            title={
              modoEnfoque ? "Restaurar temario lateral" : "Ocultar temario para pantalla completa"
            }
          >
            {modoEnfoque ? (
              <>
                <Minimize2 className="size-3.5" />
                <span className="hidden sm:inline">Salir de modo enfoque</span>
                <span className="sm:hidden">Salir</span>
              </>
            ) : (
              <>
                <Maximize2 className="size-3.5" />
                <span>Modo enfoque</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Banner de Felicitación al completar el curso */}
      {progreso === 100 && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500 text-white font-bold shrink-0">
              <Trophy className="size-5" />
            </div>
            <div>
              <p className="font-heading text-sm font-bold">¡Has completado el 100% de este curso!</p>
              <p className="text-xs opacity-90">Gran constancia y dedicación. Puedes repasar cualquier tema libremente.</p>
            </div>
          </div>
          <Badge variant="achievement" className="hidden sm:inline-flex">
            Curso Terminado 🎉
          </Badge>
        </div>
      )}

      {/* Grid del Reproductor: Se expande si el modo enfoque está activo */}
      <div
        className={cn(
          "grid gap-8 transition-all duration-300",
          modoEnfoque
            ? "grid-cols-1 max-w-4xl mx-auto"
            : "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"
        )}
      >
        {/* Contenido Principal de la Lección */}
        <article className="order-2 space-y-6 lg:order-1 min-w-0">
          {header}

          {/* US56-A: la hoja. Envuelve SOLO la tarjeta del contenido —no la
              cabecera ni la barra inferior— porque esas llevan Badge con
              colores literales en sus clases `dark:`, que dentro de la hoja
              clara se quedarían oscuros sobre papel blanco (ver la nota en
              `app/globals.css`). */}
          <div className={claseDeLaHoja(modoLectura)}>{content}</div>

          {navigation}
        </article>

        {/* Temario Lateral (Oculto en Modo Enfoque) */}
        {!modoEnfoque && (
          <aside className="order-1 lg:sticky lg:top-6 lg:order-2">
            {sidebar}
          </aside>
        )}
      </div>

      {/* BARRA INFERIOR FLOTANTE STICKY (Estilo Platzi) */}
      <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 bg-background/85 backdrop-blur-md border-t border-border/80 shadow-2xl">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
          {/* Lado Izquierdo: Botón Anterior o Resumen */}
          <div className="flex items-center gap-3 min-w-0">
            {hrefAnterior ? (
              <Link
                href={hrefAnterior}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "rounded-2xl gap-1.5 text-xs font-semibold shrink-0"
                )}
                title={tituloAnterior ?? "Lección anterior"}
              >
                <ArrowLeft className="size-3.5" />
                <span className="hidden sm:inline">Anterior</span>
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Inicio del curso
              </span>
            )}

            <div className="hidden md:block truncate">
              <span className="text-xs text-muted-foreground block truncate">
                Lección {numeroLeccion}: {tituloLeccion}
              </span>
            </div>
          </div>

          {/* Lado Centro/Derecho: Botón Completar y Siguiente */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline-block text-xs font-bold text-primary">
              {progreso}%
            </span>
            <div className="scale-95 sm:scale-100 origin-right">
              {botonCompletar}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
