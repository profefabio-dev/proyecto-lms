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
import {
  esFormaDeCodigo,
  filtroPorCodigoCurso,
  formatearCodigoCurso,
  cursosQueCoinciden,
  normalizarCodigoCurso,
} from "@/lib/course-code";
import { AppShell } from "@/components/app-shell";
import { JoinByCodeResult } from "@/components/join-by-code-result";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  // US51 (26/11/2026): si lo que escribió tiene la forma de un código de
  // clase, se busca **además** por código. Hace falta porque la búsqueda de
  // abajo (US17) mira solo los cursos donde ya está inscrito, y a un curso
  // al que se llega con un código uno todavía no pertenece: pegar el código
  // acá no encontraba nada. Solo cursos PUBLICADOS, y solo se muestran
  // título, descripción y profesor — el contenido sigue exigiendo estar
  // inscrito. No se puede descubrir un curso sin su código (US50).
  const codigoBuscado = esFormaDeCodigo(termino) ? normalizarCodigoCurso(termino) : null;

  // El tipo va escrito y no inferido: `prisma.courses` pierde el tipo en el
  // clon de verificación (el cliente no está generado) y un `any` acá
  // terminaría en JSX, que es el tropiezo que ya se corrigió tres veces —
  // ver `AGENTS.md`.
  type CursoDelCodigo = {
    id: string;
    titulo: string;
    descripcion: string;
    tutor: { nombre: string; apellido: string };
    inscritos: { id: string }[];
  };

  let cursoDelCodigo: CursoDelCodigo | null = null;

  if (codigoBuscado !== null) {
    const candidatos: CursoDelCodigo[] = await prisma.courses.findMany({
      where: { estado: "PUBLICADO", id: filtroPorCodigoCurso(codigoBuscado) },
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        tutor: { select: { nombre: true, apellido: true } },
        inscritos: { where: { userId: usuarioActual.id }, select: { id: true } },
      },
    });

    // Igual que la acción: coincidencia exacta y única. Si dos cursos
    // coincidieran, no se muestra ninguno en vez de mostrar el que sea.
    const exactos = cursosQueCoinciden(candidatos, codigoBuscado);
    cursoDelCodigo = exactos.length === 1 ? exactos[0] : null;
  }

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

  const sinResultados =
    termino.length > 0 && cursos.length === 0 && contenidos.length === 0 && !cursoDelCodigo;

  return (
    <AppShell usuario={usuarioActual} breadcrumbs={[{ label: "Búsqueda" }]}>
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        {/* CABECERA Y BUSCADOR */}
        <div className="space-y-6 rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Search className="size-4" />
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Buscar en mis asignaturas
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Encuentra lecciones, módulos y cursos en los que estás inscrito — o pega el código de
              clase que te dio tu profesor para entrar a uno nuevo.
            </p>
          </div>

          <form method="get" className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="search"
                name="q"
                defaultValue={termino}
                placeholder="Un tema, un curso... o un código como ABCD-1234"
                className="w-full h-11 rounded-2xl border border-border/80 bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                aria-label="Buscar en mis cursos"
              />
            </div>
            <Button type="submit" size="lg" className="rounded-2xl font-bold px-6">
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
                className="rounded-2xl bg-muted/60 border border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                {sug}
              </Link>
            ))}
          </div>
        </div>

        {/* CURSO ENCONTRADO POR SU CÓDIGO DE CLASE (US51) */}
        {cursoDelCodigo && (
          <JoinByCodeResult
            curso={{
              id: cursoDelCodigo.id,
              titulo: cursoDelCodigo.titulo,
              descripcion: cursoDelCodigo.descripcion,
              autor: `${cursoDelCodigo.tutor.nombre} ${cursoDelCodigo.tutor.apellido}`,
            }}
            codigo={formatearCodigoCurso(cursoDelCodigo.id)}
            yaInscrito={cursoDelCodigo.inscritos.length > 0}
          />
        )}

        {/* CÓDIGO CON FORMA VÁLIDA PERO SIN CURSO */}
        {codigoBuscado !== null && !cursoDelCodigo && (
          <div className="rounded-2xl border border-border/80 bg-card p-6 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Ningún curso activo tiene el código {formatearCodigoCurso(termino)}
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Revísalo con tu profesor: puede estar mal copiado, o el curso puede no estar publicado
              todavía.
            </p>
          </div>
        )}

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
                      className="group flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30 transition-all shadow-xs"
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
                        className="group flex items-center justify-between p-3.5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30 transition-all shadow-xs"
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
