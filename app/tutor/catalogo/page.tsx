import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  BookOpen,
  ClipboardList,
  FileQuestion,
  Library,
  Search,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { construirFiltroBusqueda } from "@/lib/search";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * US48 — el catálogo de cursos que otros docentes compartieron
 * (23/11/2026).
 *
 * **Es la única pantalla del proyecto que cruza espacios a propósito**, y
 * por eso la consulta es la que hay que leer con más cuidado: filtra por
 * `compartible: true` y trae solo la vitrina de cada curso —título,
 * descripción, portada, autor y cuánto material tiene—. Nunca sus
 * estudiantes, sus entregas ni sus notas. El contenido completo se ve
 * después de adoptarlo, en la propia copia (US47).
 *
 * El buscador reutiliza `construirFiltroBusqueda` de US17: el criterio es
 * el mismo (título o descripción, sin distinguir mayúsculas) y no tenía
 * sentido escribirlo otra vez.
 *
 * **Los cursos propios no aparecen**: el catálogo es para encontrar lo de
 * otros, y verse a uno mismo ahí solo ocupa sitio. Para ver cómo lo ven los
 * demás está la ficha, enlazada desde el propio curso.
 *
 * **28/11/2026 — el catálogo pasa a mostrar solo lo aprobado.** Hasta hoy
 * publicaba todo lo que cumpliera el piso automático de US49 y el sello
 * `verificado` era solo un distintivo, con un filtro opcional para verlo.
 * El docente pidió lo contrario: *"puede que muchos cumplan los criterios de
 * compartir pero otros sean muy básicos"*. Así que la consulta exige
 * **`verificado: true`** y el filtro desaparece, porque ya no hay dos
 * conjuntos que distinguir.
 *
 * **Por qué el argumento del 23/11 deja de valer** (está largo en US49):
 * *nadie aprueba por adelantado* era la regla correcta para una comunidad
 * gratuita, donde lo que mata es un catálogo vacío. Acá el dueño del
 * catálogo es quien va a cobrar por la plataforma y lo que circula lleva su
 * nombre. Lo que no se cambió es el piso automático: sigue filtrando lo
 * obviamente incompleto **antes** de que llegue a la cola de revisión, para
 * que esa cola no se llene de cursos de dos lecciones.
 */
export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termino = (q ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== "TUTOR") {
    redirect("/login");
  }

  const cursos = await prisma.courses.findMany({
    where: {
      compartible: true,
      // El sello del Super Administrador, que desde el 28/11/2026 es
      // requisito para aparecer acá y no un distintivo opcional.
      verificado: true,
      tutorId: { not: usuarioActual.id },
      ...(termino ? construirFiltroBusqueda(termino) : {}),
    },
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      imagen: true,
      origenAutor: true,
      verificado: true,
      tutor: { select: { nombre: true, apellido: true } },
      _count: { select: { contenidos: true, actividades: true, quizzes: true } },
    },
    // Ya todos están verificados, así que lo que ordena es la novedad.
    orderBy: [{ createdAt: "desc" }],
  });

  // Cuántos docentes adoptaron cada uno. En una sola consulta para todo el
  // catálogo, no una por curso: es la misma razón que en el panel de
  // seguimiento (US39), y aquí además dice algo real sobre la calidad de un
  // curso, más que cualquier descripción (ver US49).
  const idsCursos = cursos.map((curso: { id: string }) => curso.id);

  const adopciones = idsCursos.length
    ? await prisma.courses.groupBy({
        by: ["origenCursoId"],
        where: { origenCursoId: { in: idsCursos } },
        _count: { _all: true },
      })
    : [];

  const adopcionesPorCurso = new Map<string, number>(
    adopciones.map((fila: { origenCursoId: string | null; _count: { _all: number } }) => [
      fila.origenCursoId ?? "",
      fila._count._all,
    ])
  );

  // Cuáles ya tiene copiados, para no ofrecerle adoptar dos veces.
  const misCopias = await prisma.courses.findMany({
    where: { tutorId: usuarioActual.id, origenCursoId: { in: idsCursos } },
    select: { origenCursoId: true },
  });

  const yaAdoptados = new Set<string>(
    misCopias
      .map((copia: { origenCursoId: string | null }) => copia.origenCursoId)
      .filter((id: string | null): id is string => Boolean(id))
  );

  return (
    <AppShell
      usuario={usuarioActual}
      breadcrumbs={[{ label: "Catálogo" }]}
    >
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <PageHeader
          titulo="Catálogo de cursos"
          descripcion="Material que otros docentes compartieron. Puedes tomar cualquiera y quedarte con tu propia copia para adaptarla a tu grupo."
          icono={Library}
          insignia={`${cursos.length} ${cursos.length === 1 ? "curso" : "cursos"}`}
        />

        <form method="get" className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-60 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              name="q"
              defaultValue={termino}
              placeholder="Buscar por tema: robótica, datos, seguridad..."
              aria-label="Buscar en el catálogo"
              className="pl-9"
            />
          </div>
          <Button type="submit">Buscar</Button>
          {termino && (
            <Link
              href="/tutor/catalogo"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Limpiar
            </Link>
          )}
        </form>

        {cursos.length === 0 ? (
          <EmptyState
            icon={Library}
            message={
              termino
                ? `Ningún curso del catálogo coincide con “${termino}”.`
                : "Todavía no hay cursos publicados en el catálogo. Los que comparten otros docentes aparecen aquí cuando el administrador los revisa."
            }
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cursos.map(
              (curso: {
                id: string;
                titulo: string;
                descripcion: string;
                imagen: string | null;
                origenAutor: string | null;
                verificado: boolean;
                tutor: { nombre: string; apellido: string };
                _count: { contenidos: number; actividades: number; quizzes: number };
              }) => {
                const autor = `${curso.tutor.nombre} ${curso.tutor.apellido}`.trim();
                const veces = adopcionesPorCurso.get(curso.id) ?? 0;

                return (
                  <li key={curso.id}>
                    <Link
                      href={`/tutor/catalogo/${curso.id}`}
                      className="group block h-full overflow-hidden rounded-2xl border border-border/80 bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
                    >
                      {curso.imagen ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={curso.imagen}
                          alt=""
                          loading="lazy"
                          className="aspect-video w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-video w-full items-center justify-center bg-muted">
                          <BookOpen className="size-10 text-primary/60" aria-hidden="true" />
                        </div>
                      )}

                      <div className="space-y-3 p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          {curso.verificado && (
                            <Badge variant="default" className="gap-1 font-semibold">
                              <BadgeCheck className="size-3.5" aria-hidden="true" />
                              Verificado
                            </Badge>
                          )}
                          {yaAdoptados.has(curso.id) && (
                            <Badge variant="success" className="font-semibold">
                              Ya lo tomaste
                            </Badge>
                          )}
                          {veces > 0 && (
                            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <Users className="size-3.5" aria-hidden="true" />
                              {veces === 1
                                ? "1 docente lo usa"
                                : `${veces} docentes lo usan`}
                            </span>
                          )}
                        </div>

                        <h2 className="font-heading text-lg font-bold leading-snug text-foreground">
                          {curso.titulo}
                        </h2>

                        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {curso.descripcion}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Por <span className="font-medium text-foreground">{autor}</span>
                          {curso.origenAutor && ` · material original de ${curso.origenAutor}`}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="size-3.5" aria-hidden="true" />
                            {curso._count.contenidos}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClipboardList className="size-3.5" aria-hidden="true" />
                            {curso._count.actividades}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileQuestion className="size-3.5" aria-hidden="true" />
                            {curso._count.quizzes}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              }
            )}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
