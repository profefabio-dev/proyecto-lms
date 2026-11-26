import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle2,
  Megaphone,
  Award,
  ArrowRight,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { notaSobreCinco } from "@/lib/grades";
import { textoDePlazo } from "@/lib/novedades";
import { cn } from "@/lib/utils";

export type TareaPendiente = {
  id: string;
  titulo: string;
  courseId: string;
  cursoTitulo: string;
  fechaLimite: Date | null;
  puntajeMaximo: number;
  diasRestantes: number | null;
};

export type AnuncioSidebar = {
  id: string;
  titulo: string;
  cuerpo: string;
  courseId: string;
  cursoTitulo: string;
  fecha: Date;
  autor: string;
};

export type CalificacionSidebar = {
  id: string;
  titulo: string;
  courseId: string;
  cursoTitulo: string;
  porcentaje: number;
  retroalimentacion: string | null;
  fecha: Date;
};

export function StudentSidebarTodo({
  tareas,
  anuncios,
  calificaciones,
}: {
  tareas: TareaPendiente[];
  anuncios: AnuncioSidebar[];
  calificaciones: CalificacionSidebar[];
}) {
  return (
    <aside className="space-y-6">
      {/* 1. SECCIÓN: POR HACER (Estilo Canvas To-Do) */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-4" />
            </div>
            <h3 className="font-heading text-sm font-bold text-foreground">
              Por Hacer
            </h3>
          </div>
          {tareas.length > 0 && (
            <Badge variant="secondary" className="text-[11px] font-semibold">
              {tareas.length} {tareas.length === 1 ? "pendiente" : "pendientes"}
            </Badge>
          )}
        </div>

        {tareas.length === 0 ? (
          <div className="py-4 text-center space-y-1.5">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
              <CheckCircle2 className="size-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">¡Todo al día!</p>
            <p className="text-[11px] text-muted-foreground">
              No tienes entregas ni actividades pendientes por ahora.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {tareas.slice(0, 5).map((tarea) => {
              const urgente = tarea.diasRestantes !== null && tarea.diasRestantes <= 1;
              const vencida = tarea.diasRestantes !== null && tarea.diasRestantes < 0;

              return (
                <li key={tarea.id}>
                  <Link
                    href={`/estudiante/cursos/${tarea.courseId}`}
                    className="group block rounded-xl border border-border/70 bg-background/60 p-3 transition-all hover:border-primary/40 hover:bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-heading text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {tarea.titulo}
                      </span>
                      {tarea.diasRestantes !== null && (
                        <Badge
                          variant={vencida ? "destructive" : urgente ? "warning" : "secondary"}
                          className="shrink-0 text-[10px] px-2 py-0 font-bold"
                        >
                          {textoDePlazo(tarea.diasRestantes)}
                        </Badge>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground truncate mt-1">
                      {tarea.cursoTitulo}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-1.5">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3 text-muted-foreground/70" />
                        {tarea.puntajeMaximo} pts
                      </span>
                      <span className="text-primary font-semibold flex items-center gap-0.5 opacity-90 group-hover:opacity-100">
                        Entregar <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 2. SECCIÓN: AVISOS DEL PROFESOR (Anuncios recientes) */}
      {anuncios.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Megaphone className="size-4" />
              </div>
              <h3 className="font-heading text-sm font-bold text-foreground">
                Avisos del Docente
              </h3>
            </div>
            <span className="size-2 rounded-full bg-primary animate-pulse" />
          </div>

          <ul className="space-y-3">
            {anuncios.slice(0, 3).map((anuncio) => (
              <li key={anuncio.id}>
                <Link
                  href={`/estudiante/cursos/${anuncio.courseId}`}
                  className="group block rounded-xl border border-border/70 bg-background/60 p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <p className="font-heading text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {anuncio.titulo}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {anuncio.cuerpo}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground/80 border-t border-border/40 pt-1.5">
                    <span className="truncate max-w-[130px] font-medium">{anuncio.autor}</span>
                    <span>{new Date(anuncio.fecha).toLocaleDateString("es-CO", { month: "short", day: "numeric" })}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. SECCIÓN: ÚLTIMAS CALIFICACIONES Y FEEDBACK */}
      {calificaciones.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
                <Award className="size-4" />
              </div>
              <h3 className="font-heading text-sm font-bold text-foreground">
                Notas Recientes
              </h3>
            </div>
            <Link
              href="/estudiante/notas"
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Ver todas
            </Link>
          </div>

          <ul className="space-y-2.5">
            {calificaciones.slice(0, 3).map((cal) => (
              <li key={cal.id}>
                <Link
                  href="/estudiante/notas"
                  className="group block rounded-xl border border-border/70 bg-background/60 p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-heading text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {cal.titulo}
                    </span>
                    <Badge
                      variant={cal.porcentaje >= 60 ? "success" : "warning"}
                      className="text-[10px] px-2 py-0 font-bold tabular-nums shrink-0"
                    >
                      {notaSobreCinco(cal.porcentaje)}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {cal.cursoTitulo}
                  </p>
                  {cal.retroalimentacion && (
                    <p className="mt-2 text-[11px] italic text-muted-foreground/90 bg-muted/40 rounded-lg p-2 line-clamp-2 border-l-2 border-primary/40">
                      “{cal.retroalimentacion}”
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. ACCESOS DIRECTOS */}
      <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Accesos rápidos
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/estudiante/notas"
            className="flex items-center gap-2 rounded-xl border border-border/80 bg-card p-2.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-muted/40 transition-colors shadow-xs"
          >
            <Award className="size-4 text-emerald-500 shrink-0" />
            <span className="truncate">Mis Notas</span>
          </Link>
          <Link
            href="/estudiante/rutas"
            className="flex items-center gap-2 rounded-xl border border-border/80 bg-card p-2.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-muted/40 transition-colors shadow-xs"
          >
            <Sparkles className="size-4 text-primary shrink-0" />
            <span className="truncate">Rutas STEAM</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
