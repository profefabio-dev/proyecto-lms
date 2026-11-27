"use client";

import { useState } from "react";
import { Calendar, ChevronDown, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LessonRow } from "@/components/lesson-row";
import type { TipoContenidoConIcono } from "@/lib/content-type-icon";
import { cn } from "@/lib/utils";

export type LeccionItem = {
  id: string;
  seccionId: string | null;
  titulo: string;
  descripcion: string | null;
  tipo: TipoContenidoConIcono;
  visto: boolean;
  numero: number;
};

export type SeccionItem = {
  id: string;
  titulo: string;
  estado: string;
  esActual: boolean;
  lecciones: LeccionItem[];
};

export function CourseSectionsAccordion({
  courseId,
  secciones,
}: {
  courseId: string;
  secciones: SeccionItem[];
}) {
  // Por defecto, abrimos la sección marcada como actual, o la primera si ninguna lo está
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>(() => {
    const estadoInicial: Record<string, boolean> = {};
    const hayActual = secciones.some((s) => s.esActual);

    secciones.forEach((s, idx) => {
      if (hayActual) {
        estadoInicial[s.id] = s.esActual;
      } else {
        // Si ninguna es actual, dejamos abierta la primera
        estadoInicial[s.id] = idx === 0;
      }
    });
    return estadoInicial;
  });

  const alternarSeccion = (id: string) => {
    setAbiertas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandirTodas = () => {
    const nuevo: Record<string, boolean> = {};
    secciones.forEach((s) => {
      nuevo[s.id] = true;
    });
    setAbiertas(nuevo);
  };

  const colapsarTodas = () => {
    const nuevo: Record<string, boolean> = {};
    secciones.forEach((s) => {
      nuevo[s.id] = false;
    });
    setAbiertas(nuevo);
  };

  return (
    <div className="space-y-4">
      {/* Botones rápidos para expandir o colapsar */}
      {secciones.length > 1 && (
        <div className="flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={expandirTodas}
            className="text-muted-foreground hover:text-foreground font-semibold px-2 py-1 rounded-2xl hover:bg-muted/40 transition-colors"
          >
            Expandir todos los módulos
          </button>
          <span className="text-muted-foreground self-center">·</span>
          <button
            type="button"
            onClick={colapsarTodas}
            className="text-muted-foreground hover:text-foreground font-semibold px-2 py-1 rounded-2xl hover:bg-muted/40 transition-colors"
          >
            Colapsar todos
          </button>
        </div>
      )}

      {/* Lista de Acordeones */}
      <div className="space-y-4">
        {secciones.map((seccion) => {
          const estaAbierta = !!abiertas[seccion.id];
          const leccionesVistas = seccion.lecciones.filter((l) => l.visto).length;
          const totalLecciones = seccion.lecciones.length;
          const bloqueada = seccion.estado === "NO_DISPONIBLE";

          return (
            <div
              key={seccion.id}
              className={cn(
                "rounded-2xl border transition-all duration-200 overflow-hidden bg-card/70",
                seccion.esActual
                  ? "border-primary/50 shadow-sm"
                  : "border-border/80 hover:border-border"
              )}
            >
              {/* Encabezado del Módulo / Acordeón */}
              <button
                type="button"
                onClick={() => alternarSeccion(seccion.id)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left transition-colors hover:bg-muted/30 select-none gap-3"
                aria-expanded={estaAbierta}
              >
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-2xl font-bold transition-colors",
                      seccion.esActual
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    <Calendar className="size-4" />
                  </span>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading text-base sm:text-lg font-bold text-foreground">
                        {seccion.titulo}
                      </span>
                      {seccion.esActual && (
                        <Badge variant="success" className="text-[11px] font-semibold">
                          Semana actual
                        </Badge>
                      )}
                      {bloqueada && (
                        <Badge variant="secondary" className="gap-1 text-[11px]">
                          <Lock className="size-3" /> No disponible
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {!bloqueada && totalLecciones > 0 && (
                    <span className="hidden sm:inline-block rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                      {leccionesVistas} de {totalLecciones} completadas
                    </span>
                  )}

                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-2xl text-muted-foreground transition-transform duration-200",
                      estaAbierta ? "rotate-180 text-foreground" : ""
                    )}
                  >
                    <ChevronDown className="size-4" />
                  </div>
                </div>
              </button>

              {/* Contenido desplegable */}
              {estaAbierta && (
                <div className="p-4 sm:p-5 pt-0 border-t border-border/40 mt-1">
                  {bloqueada ? (
                    <p className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs sm:text-sm text-muted-foreground mt-3">
                      Esta sección todavía no está disponible — tu docente la habilitará según el
                      avance de la clase.
                    </p>
                  ) : totalLecciones === 0 ? (
                    <p className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs sm:text-sm text-muted-foreground mt-3">
                      Esta sección todavía no tiene lecciones publicadas.
                    </p>
                  ) : (
                    <ul className="space-y-2 mt-3">
                      {seccion.lecciones.map((leccion) => (
                        <LessonRow
                          key={leccion.id}
                          href={`/estudiante/cursos/${courseId}/lecciones/${leccion.id}`}
                          numero={leccion.numero}
                          titulo={leccion.titulo}
                          descripcion={leccion.descripcion}
                          tipo={leccion.tipo}
                          visto={leccion.visto}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
