import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Search,
  BookOpen,
  FileText,
  ArrowRight,
  Sparkles,
  Inbox,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { construirFiltroBusqueda } from "@/lib/search";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SUGERENCIAS = ["Algoritmo", "React", "Lógica", "Robótica", "Base de datos", "Código"];

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== "ESTUDIANTE") {
    redirect("/login");
  }

  const termino = (q ?? "").trim();

  // US17: la búsqueda solo mira los cursos donde el estudiante está inscrito
  // y los contenidos visibles dentro de esos cursos
  const [cursos, contenidos] =
    termino.length === 0
      ? [[], []]
      : await Promise.all([
          prisma.courses.findMany({
            where: {
              inscritos: { some: { userId: usuarioActual.id } },
              ...construirFiltroBusqueda(termino),
            },
            orderBy: { titulo: "asc" },
          }),
          prisma.contents.findMany({
            where: {
              visible: true,
              course: { inscritos: { some: { userId: usuarioActual.id } } },
              ...construirFiltroBusqueda(termino),
            },
            include: { course: { select: { id: true, titulo: true } } },
            orderBy: { titulo: "asc" },
          }),
        ]);

  const sinResultados = termino.length > 0 && cursos.length === 0 && contenidos.length === 0;

  return (
    <AppShell usuario={usuarioActual} breadcrumbs={[{ label: "Búsqueda" }]}>
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        {/* CABECERA Y BUSCADOR */}
        <div className="space-y-6 rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Search className="size-4" />
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Buscar en mis asignaturas
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Encuentra rápidamente lecciones, módulos y cursos en los que estás inscrito.
            </p>
          </div>

          <form method="get" className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="search"
                name="q"
                defaultValue={termino}
                placeholder="Escribe el nombre de una lección, tema o curso..."
                className="w-full h-11 rounded-xl border border-border/80 bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                aria-label="Buscar en mis cursos"
              />
            </div>
            <Button type="submit" size="lg" className="rounded-xl font-bold px-6">
              Buscar
            </Button>
          </form>

          {/* Sugerencias Rápidas */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50 text-xs">
            <span className="text-muted-foreground font-semibold flex items-center gap-1">
              <Sparkles className="size-3 text-primary" /> Temas frecuentes:
            </span>
            {SUGERENCIAS.map((sug) => (
              <Link
                key={sug}
                href={`/estudiante/buscar?q=${encodeURIComponent(sug)}`}
                className="rounded-lg bg-muted/60 border border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                {sug}
              </Link>
            ))}
          </div>
        </div>

        {/* MENSAJE INICIAL */}
        {termino.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-2">
            <Search className="size-8 text-muted-foreground/50 mx-auto" />
            <p className="text-sm font-semibold text-foreground">¿Qué lección necesitas hoy?</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Ingresa una palabra clave en la barra superior o haz clic en uno de los temas sugeridos para empezar.
            </p>
          </div>
        )}

        {/* SIN RESULTADOS */}
        {sinResultados && (
          <div className="rounded-2xl border border-border/80 bg-card p-10 text-center space-y-3">
            <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Inbox className="size-6" />
            </div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Sin coincidencias para &quot;{termino}&quot;
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Verifica la ortografía o intenta buscar con términos más generales como &quot;código&quot;, &quot;semana&quot; o el nombre de tu materia.
            </p>
          </div>
        )}

        {/* RESULTADOS ENCONTRADOS */}
        {(cursos.length > 0 || contenidos.length > 0) && (
          <div className="space-y-8">
            {/* Cursos Coincidentes */}
            {cursos.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="size-4 text-primary" />
                    Cursos
                  </h2>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {cursos.length} {cursos.length === 1 ? "curso" : "cursos"}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {cursos.map((curso) => (
                    <Link
                      key={curso.id}
                      href={`/estudiante/cursos/${curso.id}`}
                      className="group flex items-center justify-between p-4 rounded-xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30 transition-all shadow-xs"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="font-heading text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {curso.titulo}
                        </p>
                        {curso.descripcion && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {curso.descripcion}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Lecciones y Contenidos Coincidentes */}
            {contenidos.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                    <FileText className="size-4 text-emerald-500" />
                    Lecciones y Materiales
                  </h2>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {contenidos.length} {contenidos.length === 1 ? "lección" : "lecciones"}
                  </Badge>
                </div>

                <ul className="space-y-2.5">
                  {contenidos.map((contenido) => (
                    <li key={contenido.id}>
                      <Link
                        href={`/estudiante/cursos/${contenido.courseId}/lecciones/${contenido.id}`}
                        className="group flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30 transition-all shadow-xs"
                      >
                        <div className="min-w-0 pr-3 space-y-0.5">
                          <p className="font-heading text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {contenido.titulo}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Curso: <span className="font-medium text-foreground/80">{contenido.course.titulo}</span>
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-primary flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                          Abrir lección <ArrowRight className="size-3.5" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </AppShell>
  );
}
