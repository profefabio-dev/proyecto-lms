import Link from "next/link";
import { redirect } from "next/navigation";
import { Route, ArrowRight, BookOpen, Compass } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { JoinRutaForm } from "@/components/join-ruta-form";
import { filtrarContenidosAccesibles } from "@/lib/course-lessons";
import { calcularAvanceDeRuta } from "@/lib/route-progress";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * US44 — el catálogo de rutas del Estudiante.
 *
 * Arriba, las rutas que ya está recorriendo, con su avance; abajo, las que
 * puede empezar. Asociarse a una ruta lo inscribe en sus cursos publicados,
 * así que desde ese momento aparecen también en "Mis cursos".
 */
export default async function RutasEstudiantePage() {
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

  // Solo rutas publicadas: una ruta en borrador es material que el docente
  // todavía está armando.
  const [rutas, vistas] = await Promise.all([
    prisma.rutas.findMany({
      where: { estado: "PUBLICADA" },
      orderBy: { createdAt: "desc" },
      include: {
        tutor: { select: { nombre: true, apellido: true } },
        inscritos: { where: { userId: usuarioActual.id }, select: { id: true } },
        cursos: {
          orderBy: { orden: "asc" },
          include: {
            course: {
              select: {
                id: true,
                titulo: true,
                estado: true,
                contenidos: { select: { id: true, visible: true, seccionId: true } },
                secciones: { select: { id: true, estado: true } },
              },
            },
          },
        },
      },
    }),
    prisma.contentViews.findMany({
      where: { userId: usuarioActual.id },
      select: { contentId: true },
    }),
  ]);

  const idsVistos = new Set<string>(vistas.map((vista) => vista.contentId));

  const rutasConAvance = rutas.map((ruta) => {
    const cursos = ruta.cursos.map((fila) => {
      type ContenidoDelCurso = (typeof fila.course.contenidos)[number];
      type SeccionDelCurso = (typeof fila.course.secciones)[number];

      const idsLecciones = filtrarContenidosAccesibles<ContenidoDelCurso, SeccionDelCurso>(
        fila.course.contenidos,
        fila.course.secciones
      ).map((contenido) => contenido.id);

      return {
        courseId: fila.course.id,
        titulo: fila.course.titulo,
        total: idsLecciones.length,
        vistas: idsLecciones.filter((id) => idsVistos.has(id)).length,
      };
    });

    return {
      id: ruta.id,
      titulo: ruta.titulo,
      descripcion: ruta.descripcion,
      tutor: ruta.tutor,
      asociado: ruta.inscritos.length > 0,
      totalCursos: ruta.cursos.length,
      avance: calcularAvanceDeRuta(cursos),
    };
  });

  const misRutas = rutasConAvance.filter((ruta) => ruta.asociado);
  const porEmpezar = rutasConAvance.filter((ruta) => !ruta.asociado);

  return (
    <AppShell usuario={usuarioActual} breadcrumbs={[{ label: "Rutas de aprendizaje" }]}>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <PageHeader
          titulo="Rutas de Aprendizaje"
          descripcion="Un recorrido de varios cursos en orden, con un solo avance de principio a fin."
          icono={Route}
          insignia={`${misRutas.length} ${misRutas.length === 1 ? "ruta en curso" : "rutas en curso"}`}
        />

        {/* MIS RUTAS */}
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground">Mis rutas</h2>

          {misRutas.length === 0 ? (
            <EmptyState
              icon={Compass}
              message="Todavía no te has asociado a ninguna ruta. Mira abajo las que tu docente publicó."
            />
          ) : (
            <ul className="space-y-3">
              {misRutas.map((ruta) => (
                <li
                  key={ruta.id}
                  className="space-y-4 rounded-2xl border border-primary/30 bg-card p-5 shadow-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {ruta.titulo}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {ruta.totalCursos} {ruta.totalCursos === 1 ? "curso" : "cursos"} ·{" "}
                        {ruta.avance.leccionesTotales}{" "}
                        {ruta.avance.leccionesTotales === 1 ? "lección" : "lecciones"}
                      </p>
                    </div>

                    <Badge
                      variant={ruta.avance.progreso === 100 ? "success" : "default"}
                      className="font-semibold"
                    >
                      {ruta.avance.progreso}%
                    </Badge>
                  </div>

                  <Progress
                    value={ruta.avance.progreso}
                    variant={ruta.avance.progreso === 100 ? "success" : "default"}
                    size="lg"
                    aria-label={`Avance de la ruta ${ruta.titulo}`}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {ruta.avance.cursosCompletados} de {ruta.avance.cursosConContenido} cursos
                      completados
                    </p>

                    <Link
                      href={`/estudiante/rutas/${ruta.id}`}
                      className={cn(buttonVariants({ variant: "outline" }), "gap-2 font-semibold")}
                    >
                      Ver la ruta
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* RUTAS DISPONIBLES */}
        <section className="space-y-4 border-t border-border/60 pt-6">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">Rutas disponibles</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Al asociarte, quedas inscrito en los cursos de la ruta y aparecen en tus cursos.
            </p>
          </div>

          {porEmpezar.length === 0 ? (
            <EmptyState
              icon={Route}
              message="No hay rutas nuevas por ahora. Tu docente las publica desde su panel."
            />
          ) : (
            <ul className="space-y-3">
              {porEmpezar.map((ruta) => (
                <li
                  key={ruta.id}
                  className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs"
                >
                  <div className="space-y-1">
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      {ruta.titulo}
                    </h3>
                    <p className="text-sm text-muted-foreground">{ruta.descripcion}</p>
                    <p className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="size-3.5 text-duo-blue" />
                        {ruta.totalCursos} {ruta.totalCursos === 1 ? "curso" : "cursos"}
                      </span>
                      {ruta.tutor && (
                        <span>
                          Docente: {ruta.tutor.nombre} {ruta.tutor.apellido}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
                    <JoinRutaForm rutaId={ruta.id} />
                    <Link
                      href={`/estudiante/rutas/${ruta.id}`}
                      className={cn(buttonVariants({ variant: "ghost" }), "gap-2 text-sm")}
                    >
                      Ver qué incluye
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
