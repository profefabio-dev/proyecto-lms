"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  BookOpen,
  ArrowRight,
  Code2,
  Cpu,
  Database,
  Terminal,
  Sparkles,
  Layers,
  GraduationCap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type LandingCurso = {
  id: string;
  titulo: string;
  descripcion: string;
  tag: string;
  categoria?: string;
  nivel: string;
  modulos: string;
  tutorNombre?: string;
  gradient?: string;
};

const CATEGORIAS = [
  { id: "todas", label: "Todos los cursos", icon: Sparkles },
  { id: "web", label: "Desarrollo Web", icon: Code2 },
  { id: "algoritmos", label: "Lógica y Código", icon: Terminal },
  { id: "robotica", label: "Robótica & IoT", icon: Cpu },
  { id: "datos", label: "Bases de Datos", icon: Database },
];

export function LandingCoursesCatalog({
  cursos,
  busquedaInicial = "",
}: {
  cursos: LandingCurso[];
  busquedaInicial?: string;
}) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");
  const [terminoBusqueda, setTerminoBusqueda] = useState(busquedaInicial);

  const cursosFiltrados = useMemo(() => {
    return cursos.filter((curso) => {
      // Filtro por categoría
      if (categoriaSeleccionada !== "todas") {
        const cat = curso.categoria?.toLowerCase() || "";
        const tag = curso.tag.toLowerCase();
        const titulo = curso.titulo.toLowerCase();

        if (categoriaSeleccionada === "web" && !cat.includes("web") && !tag.includes("web") && !titulo.includes("web")) {
          return false;
        }
        if (categoriaSeleccionada === "algoritmos" && !cat.includes("algoritmo") && !tag.includes("lógica") && !tag.includes("algoritmo") && !titulo.includes("algoritmo") && !titulo.includes("lógica")) {
          return false;
        }
        if (categoriaSeleccionada === "robotica" && !cat.includes("robot") && !tag.includes("hardware") && !tag.includes("robot") && !titulo.includes("robot") && !titulo.includes("iot")) {
          return false;
        }
        if (categoriaSeleccionada === "datos" && !cat.includes("dato") && !tag.includes("dato") && !tag.includes("backend") && !titulo.includes("dato")) {
          return false;
        }
      }

      // Filtro por texto
      if (terminoBusqueda.trim() !== "") {
        const query = terminoBusqueda.toLowerCase().trim();
        const coincideTitulo = curso.titulo.toLowerCase().includes(query);
        const coincideDesc = curso.descripcion.toLowerCase().includes(query);
        const coincideTag = curso.tag.toLowerCase().includes(query);
        return coincideTitulo || coincideDesc || coincideTag;
      }

      return true;
    });
  }, [cursos, categoriaSeleccionada, terminoBusqueda]);

  return (
    <div className="space-y-8">
      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Chips de Categorías en Píldoras (Estilo Platzi) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {CATEGORIAS.map((cat) => {
            const Icono = cat.icon;
            const activa = categoriaSeleccionada === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoriaSeleccionada(cat.id)}
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border",
                  activa
                    ? "bg-primary text-primary-foreground border-primary shadow-xs scale-102"
                    : "bg-card text-muted-foreground border-border/80 hover:text-foreground hover:border-primary/40 hover:bg-muted/40"
                )}
              >
                <Icono className="size-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Buscador de cursos */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            placeholder="Buscar por tema o tecnología..."
            className="w-full h-10 rounded-2xl border border-border/80 bg-card pl-10 pr-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Grid de Cursos Modernos */}
      {cursosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card/60 p-12 text-center space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Search className="size-6" />
          </div>
          <h3 className="font-heading text-base font-bold text-foreground">
            No encontramos cursos con ese criterio
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Intenta buscar con otros términos como &quot;React&quot;, &quot;Lógica&quot;, &quot;Robótica&quot; o limpia el filtro.
          </p>
          <button
            type="button"
            onClick={() => {
              setCategoriaSeleccionada("todas");
              setTerminoBusqueda("");
            }}
            className="text-xs font-semibold text-primary hover:underline pt-2 inline-block"
          >
            Ver todos los cursos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cursosFiltrados.map((curso, idx) => {
            const gradiente =
              curso.gradient ||
              (idx % 4 === 0
                ? "from-blue-600 to-indigo-600"
                : idx % 4 === 1
                  ? "from-indigo-600 to-violet-600"
                  : idx % 4 === 2
                    ? "from-violet-600 to-purple-600"
                    : "from-emerald-600 to-teal-700");

            return (
              <div
                key={curso.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div>
                  {/* Portada estilizada con gradiente e icono temático */}
                  <div
                    className={cn(
                      "relative h-40 w-full bg-gradient-to-tr p-4 flex flex-col justify-between text-white overflow-hidden",
                      gradiente
                    )}
                  >
                    <div className="flex items-center justify-between z-10">
                      <span className="rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white border border-white/10">
                        {curso.tag}
                      </span>
                      <span className="text-[11px] font-semibold text-white/90 bg-white/15 px-2 py-0.5 rounded-2xl">
                        {curso.nivel}
                      </span>
                    </div>

                    <div className="flex items-end justify-between z-10">
                      <span className="text-xs text-white/90 font-medium flex items-center gap-1">
                        <Layers className="size-3.5" />
                        {curso.modulos}
                      </span>
                      <BookOpen className="size-6 text-white/80 transition-transform group-hover:scale-110" />
                    </div>

                    {/* Sutil overlay hover */}
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                  </div>

                  {/* Cuerpo de la tarjeta */}
                  <div className="p-5 space-y-2">
                    <h3 className="font-heading text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {curso.titulo}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {curso.descripcion}
                    </p>
                  </div>
                </div>

                {/* Footer de la tarjeta con tutor y botón */}
                <div className="p-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground mt-auto">
                  <div className="flex items-center gap-1.5 truncate">
                    <GraduationCap className="size-3.5 text-primary shrink-0" />
                    <span className="truncate">{curso.tutorNombre || "Prof. Fabio Aguirre"}</span>
                  </div>

                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary/80 transition-transform group-hover:translate-x-0.5"
                  >
                    Ingresar
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
