"use client";

import { useState, useMemo } from "react";
import { BookOpen, Search, Sparkles } from "lucide-react";
import { CourseCard } from "@/components/course-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { JoinCourseDialog } from "@/components/join-course-dialog";

export type CursoItem = {
  id: string;
  courseId: string;
  href: string;
  hrefContinuar: string;
  titulo: string;
  imagen: string | null;
  tutor: { nombre: string; apellido: string } | null;
  estadoLabel: string;
  progreso: number;
  contenidosVistos: number;
  totalContenidos: number;
  completado: boolean;
};

type FiltroTab = "todos" | "en_progreso" | "completados";

export function StudentCoursesList({
  cursos,
}: {
  cursos: CursoItem[];
}) {
  const [filtro, setFiltro] = useState<FiltroTab>("todos");
  const [busqueda, setBusqueda] = useState("");

  const totalCursos = cursos.length;
  const enProgresoCount = cursos.filter((c) => !c.completado).length;
  const completadosCount = cursos.filter((c) => c.completado).length;

  const cursosFiltrados = useMemo(() => {
    return cursos.filter((c) => {
      // Filtro de pestaña
      if (filtro === "en_progreso" && c.completado) return false;
      if (filtro === "completados" && !c.completado) return false;

      // Filtro de texto
      if (busqueda.trim() !== "") {
        const query = busqueda.toLowerCase().trim();
        const coincideTitulo = c.titulo.toLowerCase().includes(query);
        const coincideTutor =
          c.tutor &&
          `${c.tutor.nombre} ${c.tutor.apellido}`.toLowerCase().includes(query);
        return coincideTitulo || coincideTutor;
      }

      return true;
    });
  }, [cursos, filtro, busqueda]);

  if (totalCursos === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={BookOpen}
          message="Todavía no estás inscrito en ningún curso institucional."
        />
        <div className="flex justify-center pt-2">
          <JoinCourseDialog />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de Controles: Filtros en Píldoras + Botón Unirse + Buscador rápido */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        {/* Pestañas de filtrado */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/40 border border-border/60 w-fit">
          <button
            type="button"
            onClick={() => setFiltro("todos")}
            className={`px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all ${
              filtro === "todos"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos ({totalCursos})
          </button>

          <button
            type="button"
            onClick={() => setFiltro("en_progreso")}
            className={`px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all ${
              filtro === "en_progreso"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            En Curso ({enProgresoCount})
          </button>

          <button
            type="button"
            onClick={() => setFiltro("completados")}
            className={`px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all ${
              filtro === "completados"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Completados ({completadosCount})
          </button>
        </div>

        {/* Acciones de la derecha: Unirme a curso + Buscador */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <JoinCourseDialog />

          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Filtrar cursos..."
              className="w-full h-9 rounded-2xl border border-border/80 bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Grid de Cursos */}
      {cursosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-muted/10 p-8 text-center space-y-2">
          <p className="font-heading text-sm font-semibold text-foreground">
            No se encontraron cursos
          </p>
          <p className="text-xs text-muted-foreground">
            Intenta cambiar el término de búsqueda o la pestaña seleccionada.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {cursosFiltrados.map((curso, index) => (
            <CourseCard
              key={curso.id}
              href={curso.href}
              index={index}
              titulo={curso.titulo}
              imagen={curso.imagen}
              tutor={curso.tutor}
              estadoLabel={curso.estadoLabel}
              progreso={curso.progreso}
              contenidosVistos={curso.contenidosVistos}
              totalContenidos={curso.totalContenidos}
              completado={curso.completado}
            />
          ))}
        </div>
      )}
    </div>
  );
}
