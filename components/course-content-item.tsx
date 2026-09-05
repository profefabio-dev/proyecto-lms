import type { ReactNode } from "react";
import { MarkContentViewedButton } from "@/components/mark-content-viewed-button";
import { cn } from "@/lib/utils";
import { ICONO_POR_TIPO, type TipoContenidoConIcono } from "@/lib/content-type-icon";

// US31 (05/09/2026): el docente evaluador señaló que la vista de contenidos
// de un curso tenía "mucho espacio libre" y que "los contenidos como tal se
// ven muy pequeños" (el <li> anterior era solo un título en `font-medium`
// más el cuerpo, sin jerarquía visual). Este componente le da a cada
// contenido más peso: un ícono grande por tipo, un número de orden, título
// más grande, y una tarjeta con más aire interno — en vez de una lista
// plana de texto pequeño en un contenedor angosto. El mapa ícono/color por
// tipo vive en `lib/content-type-icon.ts`, compartido con
// `CourseContentOutline` (antes estaba copiado igual en los dos archivos).
//
// Tercera vuelta (mismo día): tras ver la versión con barra lateral, el
// docente pidió explícitamente agrandar las tarjetas "al menos al doble" —
// no bastaba con darles más peso relativo, había que hacerlas notablemente
// más grandes en términos absolutos. Se duplicó (o casi) cada medida clave:
// el círculo de ícono (12→24), el ícono mismo (6→10), el título (lg/xl→
// 2xl/3xl), el espaciado interno (p-5/6→p-8/10) y el espacio entre tarjetas
// en la página (space-y-5→space-y-8, ver `page.tsx`).
//
// Cuarta vuelta (mismo día): el docente confirmó que ya se veía más grande
// pero pidió llevarlo todavía más allá ("podría ser más grande aún") — se
// sube otro escalón completo en cada medida (círculo de ícono 24→28, ícono
// 10→14, título 2xl/3xl→3xl/4xl, padding 8/10→10/12, espacio entre tarjetas
// 8→10 en `page.tsx`).

// Server Component a propósito (sin "use client"): lo único interactivo de
// un contenido es el botón "Marcar como visto", ya aislado en
// `MarkContentViewedButton`. El resto —ícono, número, título, descripción,
// y el contenido embebido que llega como `children`— es HTML/CSS puro.
export function CourseContentItem({
  numero,
  index,
  titulo,
  descripcion,
  tipo,
  contentId,
  visto,
  children,
}: {
  numero: number;
  index: number;
  titulo: string;
  descripcion: string | null;
  tipo: TipoContenidoConIcono;
  contentId: string;
  visto: boolean;
  children: ReactNode;
}) {
  const { Icon, clase } = ICONO_POR_TIPO[tipo];

  return (
    <li
      id={`contenido-${contentId}`}
      className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both list-none scroll-mt-6 overflow-hidden rounded-3xl border bg-card shadow-sm transition-shadow hover:shadow-md"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms`, animationDuration: "400ms" }}
    >
      <div className="flex flex-wrap items-start gap-6 p-10 sm:gap-8 sm:p-12">
        <div
          className={cn(
            "flex size-20 shrink-0 items-center justify-center rounded-3xl text-white sm:size-28",
            clase
          )}
        >
          <Icon className="size-10 sm:size-14" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-base font-bold tracking-wide text-muted-foreground uppercase">
              Contenido {numero}
            </span>
            <MarkContentViewedButton contentId={contentId} visto={visto} />
          </div>
          <h3 className="text-3xl font-bold text-balance sm:text-4xl">{titulo}</h3>
          {descripcion && <p className="text-lg text-muted-foreground">{descripcion}</p>}
        </div>
      </div>
      <div className="border-t px-10 pt-8 pb-10 sm:px-12">{children}</div>
    </li>
  );
}
