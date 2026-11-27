import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  FileText,
  ArrowRight,
  Sparkles,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  Eye,
  TrendingUp,
  Plus,
  Route,
  Library,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function TutorPage() {
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

  const cursosDelTutor = await prisma.courses.findMany({
    where: { tutorId: usuarioActual.id },
    include: {
      _count: {
        select: {
          inscritos: true,
          contenidos: true,
          actividades: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const idsCursos = cursosDelTutor.map((curso) => curso.id);

  const [
    inscripcionesUnicas,
    totalContenidos,
    entregasPendientes,
    totalPendientes,
    copiasAdoptadas,
  ] =
    idsCursos.length > 0
      ? await Promise.all([
          prisma.courseUsers.findMany({
            where: { courseId: { in: idsCursos } },
            distinct: ["userId"],
            select: { userId: true },
          }),
          prisma.contents.count({ where: { courseId: { in: idsCursos } } }),
          prisma.entregas.findMany({
            where: {
              actividad: { courseId: { in: idsCursos } },
              nota: null,
            },
            include: {
              user: { select: { nombre: true, apellido: true } },
              actividad: {
                select: { id: true, titulo: true, courseId: true, puntajeMaximo: true },
              },
            },
            orderBy: { entregadaEn: "desc" },
            take: 5,
          }),
          prisma.entregas.count({
            where: {
              actividad: { courseId: { in: idsCursos } },
              nota: null,
            },
          }),
          // US49: impacto comunitario — cuántas copias se han adoptado de mis cursos
          prisma.courses.findMany({
            where: { origenCursoId: { in: idsCursos } },
            select: { id: true, tutorId: true },
          }),
        ])
      : [[], 0, [], 0, []];

  const tutoresQueAdoptaron = new Set(
    copiasAdoptadas.map((c: { id: string; tutorId: string }) => c.tutorId)
  ).size;
  const idsCopias = copiasAdoptadas.map((c: { id: string; tutorId: string }) => c.id);
  const estudiantesImpactados =
    idsCopias.length > 0
      ? await prisma.courseUsers.count({
          where: { courseId: { in: idsCopias } },
        })
      : 0;

  // Los parámetros de tipo van explícitos: `cursosDelTutor` sale de un
  // `Promise.all` con respaldo `[[], 0, [], 0]`, así que TypeScript pierde
  // el tipo y el `Map` quedaría como `Map<any, unknown>` — y un `unknown`
  // no se puede renderizar. Es el mismo tropiezo ya corregido en el panel
  // de Seguimiento (19/11/2026) y en `construirPlanilla` (22/11/2026).
  const tituloPorCurso = new Map<string, string>(
    cursosDelTutor.map((c: { id: string; titulo: string }) => [c.id, c.titulo])
  );

  return (
    <AppShell usuario={usuarioActual} breadcrumbs={[{ label: "Panel del docente" }]}>
      <main className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 py-8">
        {/* BANNER DE BIENVENIDA AL DOCENTE */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider">
                  Docente / Tutor
                </Badge>
                <span className="flex items-center gap-1 text-xs text-primary font-medium">
                  <Sparkles className="size-3.5" /> Campus Virtual Docente
                </span>
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                ¡Hola, Prof. {usuarioActual.nombre}! 👋
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Gestiona tus cursos, revisa entregas de tus estudiantes y organiza los contenidos de aprendizaje.
              </p>
            </div>

            {/* Accesos rápidos principales */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href="/tutor/cursos"
                className={cn(buttonVariants({ size: "default" }), "gap-1.5 font-bold rounded-xl shadow-xs")}
              >
                <Plus className="size-4" />
                Nuevo Curso
              </Link>
              <Link
                href="/tutor/rutas"
                className={cn(buttonVariants({ variant: "outline", size: "default" }), "gap-1.5 font-semibold rounded-xl")}
              >
                <Route className="size-4 text-primary" />
                Rutas STEAM
              </Link>
            </div>
          </div>
        </div>

        {/* RESUMEN DE INDICADORES (KPIs) */}
        <section aria-label="Indicadores generales" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Mis cursos</p>
              <p className="font-heading text-xl font-bold text-foreground">
                {cursosDelTutor.length} {cursosDelTutor.length === 1 ? "activo" : "activos"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Estudiantes únicos</p>
              <p className="font-heading text-xl font-bold text-foreground">
                {inscripcionesUnicas.length}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Lecciones creadas</p>
              <p className="font-heading text-xl font-bold text-foreground">{totalContenidos}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex items-center gap-3.5">
            <div className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl font-bold",
              totalPendientes > 0
                ? "bg-amber-500/15 text-amber-500"
                : "bg-emerald-500/10 text-emerald-500"
            )}>
              <ClipboardCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Por calificar</p>
              <p className={cn(
                "font-heading text-xl font-bold",
                totalPendientes > 0 ? "text-amber-500" : "text-emerald-500"
              )}>
                {totalPendientes} {totalPendientes === 1 ? "entrega" : "entregas"}
              </p>
            </div>
          </div>
        </section>

        {/* US49: IMPACTO COMUNITARIO */}
        {tutoresQueAdoptaron > 0 && (
          <section
            aria-label="Impacto comunitario"
            className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                <Sparkles className="size-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-heading font-bold text-foreground text-sm sm:text-base">
                  Tu material compartido tiene impacto en la comunidad
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Tus cursos han sido adoptados por{" "}
                  <strong className="text-foreground font-semibold">
                    {tutoresQueAdoptaron} {tutoresQueAdoptaron === 1 ? "docente" : "docentes"}
                  </strong>{" "}
                  y están beneficiando a{" "}
                  <strong className="text-foreground font-semibold">
                    {estudiantesImpactados} {estudiantesImpactados === 1 ? "estudiante" : "estudiantes"}
                  </strong>{" "}
                  en otros espacios.
                </p>
              </div>
            </div>
            <Link
              href="/tutor/catalogo"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs shrink-0 rounded-xl font-semibold")}
            >
              Explorar catálogo
            </Link>
          </section>
        )}

        {/* CONTENIDO PRINCIPAL: 2 COLUMNAS (CANVAS TEACHER DASHBOARD) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA IZQUIERDA: MIS CURSOS ACTIVOS (lg:col-span-8) */}
          <section className="lg:col-span-8 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">
                  Mis Asignaturas
                </h2>
                <p className="text-xs text-muted-foreground">
                  Gestiona materiales, lecciones y alumnos de tus cursos.
                </p>
              </div>

              <Link
                href="/tutor/cursos"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Ver todos <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {cursosDelTutor.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-10 text-center space-y-3">
                <BookOpen className="size-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-semibold text-foreground">Aún no has creado ningún curso</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Crea tu primera asignatura para empezar a subir material y matricular alumnos.
                </p>
                <Link
                  href="/tutor/cursos"
                  className={cn(buttonVariants({ size: "sm" }), "font-bold rounded-xl")}
                >
                  Crear mi primer curso
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {cursosDelTutor.slice(0, 4).map((curso) => {
                  const publicado = curso.estado === "PUBLICADO";

                  return (
                    <div
                      key={curso.id}
                      className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <Badge
                            variant={publicado ? "success" : "secondary"}
                            className="text-[10px] font-bold uppercase tracking-wider"
                          >
                            {publicado ? "Publicado" : "Borrador"}
                          </Badge>

                          <Link
                            href={`/estudiante/cursos/${curso.id}`}
                            className="text-muted-foreground hover:text-primary transition-colors p-1"
                            title="Ver como estudiante"
                          >
                            <Eye className="size-4" />
                          </Link>
                        </div>

                        <div>
                          <h3 className="font-heading text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {curso.titulo}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                            {curso.descripcion}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1">
                            <Users className="size-3.5" />
                            {curso._count.inscritos} alumnos
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <FileText className="size-3.5" />
                            {curso._count.contenidos} lecciones
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3 mt-4">
                        <Link
                          href={`/tutor/cursos/${curso.id}/seguimiento`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "xs" }),
                            "gap-1 text-muted-foreground hover:text-foreground text-xs"
                          )}
                        >
                          <TrendingUp className="size-3.5" />
                          Progreso
                        </Link>

                        <Link
                          href={`/tutor/cursos/${curso.id}`}
                          className={cn(
                            buttonVariants({ size: "xs" }),
                            "gap-1 font-bold rounded-lg text-xs"
                          )}
                        >
                          Gestionar
                          <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* COLUMNA DERECHA: POR CALIFICAR & ACCESOS RÁPIDOS (lg:col-span-4) */}
          <aside className="lg:col-span-4 space-y-6">
            {/* WIDGET 1: POR CALIFICAR (SpeedGrader estilo Canvas) */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                    <ClipboardCheck className="size-4" />
                  </div>
                  <h3 className="font-heading text-sm font-bold text-foreground">
                    Por Calificar
                  </h3>
                </div>
                {totalPendientes > 0 && (
                  <Badge variant="warning" className="text-[10px] font-bold">
                    {totalPendientes} pendientes
                  </Badge>
                )}
              </div>

              {entregasPendientes.length === 0 ? (
                <div className="py-5 text-center space-y-1.5">
                  <div className="size-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">¡Todo calificado!</p>
                  <p className="text-[11px] text-muted-foreground">
                    No tienes entregas pendientes de revisión en tus cursos.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {entregasPendientes.map((entrega) => (
                    <li key={entrega.id}>
                      <Link
                        href={`/tutor/cursos/${entrega.actividad.courseId}/actividades/${entrega.actividad.id}`}
                        className="group block rounded-xl border border-border/70 bg-background/60 p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-heading text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {entrega.actividad.titulo}
                          </span>
                          <span className="text-[10px] font-bold text-primary shrink-0">
                            {entrega.actividad.puntajeMaximo} pts
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          Estudiante: <span className="font-medium text-foreground/80">{entrega.user.nombre} {entrega.user.apellido}</span>
                        </p>

                        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-1.5">
                          <span className="truncate max-w-[140px]">
                            {tituloPorCurso.get(entrega.actividad.courseId)}
                          </span>
                          <span className="text-primary font-semibold flex items-center gap-0.5">
                            Revisar <ArrowRight className="size-3" />
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* WIDGET 2: HERRAMIENTAS DIRECTAS */}
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Herramientas del Docente
              </p>
              <div className="space-y-2">
                <Link
                  href="/tutor/estudiantes"
                  className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-muted/40 transition-colors shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <Users className="size-4 text-emerald-500" />
                    Listado de Estudiantes
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>

                <Link
                  href="/tutor/rutas"
                  className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-muted/40 transition-colors shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <Route className="size-4 text-primary" />
                    Rutas de Aprendizaje STEAM
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>

                <Link
                  href="/tutor/catalogo"
                  className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-muted/40 transition-colors shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <Library className="size-4 text-indigo-400" />
                    Catálogo de Cursos Compartidos
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
