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

        {/* MIS RUTAS (RUTAS ACTIVAS) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold text-foreground">Mis Rutas en Curso</h2>
            {misRutas.length > 0 && (
              <Badge variant="outline" className="text-xs font-semibold">
                {misRutas.length} {misRutas.length === 1 ? "activa" : "activas"}
              </Badge>
            )}
          </div>

          {misRutas.length === 0 ? (
            <EmptyState
              icon={Compass}
              message="Todavía no te has asociado a ninguna ruta. Mira abajo las rutas STEAM disponibles para comenzar."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {misRutas.map((ruta) => (
                <div
                  key={ruta.id}
                  className="flex flex-col justify-between space-y-4 rounded-2xl border border-primary/30 bg-card p-5 shadow-xs transition-all hover:border-primary/60 hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Route className="size-4" />
                        </span>
                        <div>
                          <h3 className="font-heading text-base font-bold text-foreground line-clamp-1">
                            {ruta.titulo}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {ruta.totalCursos} {ruta.totalCursos === 1 ? "curso" : "cursos"} ·{" "}
                            {ruta.avance.leccionesTotales}{" "}
                            {ruta.avance.leccionesTotales === 1 ? "lección" : "lecciones"}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={ruta.avance.progreso === 100 ? "success" : "default"}
                        className="font-semibold text-xs"
                      >
                        {ruta.avance.progreso}%
                      </Badge>
                    </div>

                    {ruta.descripcion && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {ruta.descripcion}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <Progress
                      value={ruta.avance.progreso}
                      variant={ruta.avance.progreso === 100 ? "success" : "default"}
                      size="default"
                      aria-label={`Avance de la ruta ${ruta.titulo}`}
                    />

                    <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3 text-xs">
                      <span className="text-muted-foreground font-medium">
                        {ruta.avance.cursosCompletados} de {ruta.avance.cursosConContenido} cursos listos
                      </span>

                      <Link
                        href={`/estudiante/rutas/${ruta.id}`}
                        className={cn(
                          buttonVariants({ size: "sm" }),
                          "gap-1.5 font-bold rounded-2xl text-xs"
                        )}
                      >
                        Continuar
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RUTAS DISPONIBLES */}
        <section className="space-y-4 border-t border-border/60 pt-6">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">Rutas Disponibles</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Al asociarte, quedas inscrito automáticamente en todos sus cursos para aprender la habilidad completa.
            </p>
          </div>

          {porEmpezar.length === 0 ? (
            <EmptyState
              icon={Route}
              message="No hay rutas nuevas por ahora. Tu docente las publica desde su panel."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {porEmpezar.map((ruta) => (
                <div
                  key={ruta.id}
                  className="flex flex-col justify-between space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                        <BookOpen className="size-4" />
                      </span>
                      <h3 className="font-heading text-base font-bold text-foreground line-clamp-1">
                        {ruta.titulo}
                      </h3>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {ruta.descripcion}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                      <span className="font-medium">
                        {ruta.totalCursos} {ruta.totalCursos === 1 ? "curso" : "cursos"} incluidos
                      </span>
                      {ruta.tutor && (
                        <span>
                          Docente: {ruta.tutor.nombre} {ruta.tutor.apellido}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                    <Link
                      href={`/estudiante/rutas/${ruta.id}`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "gap-1.5 text-xs font-semibold"
                      )}
                    >
                      Ver temario
                      <ArrowRight className="size-3.5" />
                    </Link>
                    <JoinRutaForm rutaId={ruta.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
