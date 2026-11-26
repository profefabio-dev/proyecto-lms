import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Flame,
  Search,
  Trophy,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  PlayCircle,
  BarChart3,
  GraduationCap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { obtenerEstadoEstudiante } from "@/lib/course-status";
import { calcularProgreso } from "@/lib/course-progress";
import {
  filtrarContenidosAccesibles,
  ordenarLecciones,
  siguienteLeccionPendiente,
} from "@/lib/course-lessons";
import { calcularRacha } from "@/lib/streak";
import { porcentajeDeNota } from "@/lib/grades";
import { DIAS_DE_VENTANA, diasHasta } from "@/lib/novedades";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StudentCoursesList } from "@/components/student-courses-list";
import {
  StudentSidebarTodo,
  type TareaPendiente,
  type AnuncioSidebar,
  type CalificacionSidebar,
} from "@/components/student-sidebar-todo";
import { ICONO_POR_TIPO, type TipoContenidoConIcono } from "@/lib/content-type-icon";
import { cn } from "@/lib/utils";

export default async function EstudiantePage() {
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

  // Carga paralela de inscripciones y vistas de contenido
  const [inscripciones, vistas] = await Promise.all([
    prisma.courseUsers.findMany({
      where: { userId: usuarioActual.id },
      include: {
        course: {
          include: {
            contenidos: {
              where: { visible: true },
              orderBy: { orden: "asc" },
              select: {
                id: true,
                visible: true,
                seccionId: true,
                titulo: true,
                tipo: true,
                orden: true,
              },
            },
            secciones: { orderBy: { orden: "asc" }, select: { id: true, estado: true } },
            tutor: { select: { nombre: true, apellido: true } },
          },
        },
      },
      orderBy: { fecha: "desc" },
    }),
    prisma.contentViews.findMany({
      where: { userId: usuarioActual.id },
      select: { contentId: true, vistoEn: true },
    }),
  ]);

  const idsVistos = new Set<string>(vistas.map((vista) => vista.contentId));
  const racha = calcularRacha(vistas.map((vista) => vista.vistoEn));

  const ahora = new Date();
  const desde = new Date(ahora);
  desde.setDate(desde.getDate() - DIAS_DE_VENTANA);

  const idsCursos = inscripciones.map(
    (inscripcion: { courseId: string }) => inscripcion.courseId
  );
  const tituloPorCurso = new Map<string, string>(
    inscripciones.map((inscripcion: { courseId: string; course: { titulo: string } }) => [
      inscripcion.courseId,
      inscripcion.course.titulo,
    ])
  );

  // Consultas de actividades, anuncios y calificaciones para el To-Do Sidebar
  const [calificadas, todasActividades, anuncios] = idsCursos.length
    ? await Promise.all([
        prisma.entregas.findMany({
          where: {
            userId: usuarioActual.id,
            calificadaEn: { gte: desde },
            actividad: { courseId: { in: idsCursos } },
          },
          orderBy: { calificadaEn: "desc" },
          take: 6,
          select: {
            nota: true,
            retroalimentacion: true,
            calificadaEn: true,
            actividad: { select: { id: true, titulo: true, courseId: true, puntajeMaximo: true } },
          },
        }),
        prisma.actividades.findMany({
          where: {
            courseId: { in: idsCursos },
            visible: true,
          },
          orderBy: [{ fechaLimite: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            titulo: true,
            courseId: true,
            fechaLimite: true,
            puntajeMaximo: true,
            entregas: { where: { userId: usuarioActual.id }, select: { id: true } },
          },
        }),
        prisma.anuncios.findMany({
          where: { courseId: { in: idsCursos }, createdAt: { gte: desde } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            titulo: true,
            cuerpo: true,
            courseId: true,
            createdAt: true,
            tutor: { select: { nombre: true, apellido: true } },
          },
        }),
      ])
    : [[], [], []];

  // Armamos las tareas pendientes (Estilo Canvas To-Do)
  const tareasPendientes: TareaPendiente[] = todasActividades
    .filter((a) => a.entregas.length === 0)
    .map((a) => ({
      id: a.id,
      titulo: a.titulo,
      courseId: a.courseId,
      cursoTitulo: tituloPorCurso.get(a.courseId) ?? "",
      fechaLimite: a.fechaLimite,
      puntajeMaximo: a.puntajeMaximo,
      diasRestantes: a.fechaLimite ? diasHasta(a.fechaLimite, ahora) : null,
    }))
    .sort((a, b) => {
      if (a.diasRestantes !== null && b.diasRestantes !== null) {
        return a.diasRestantes - b.diasRestantes;
      }
      if (a.diasRestantes !== null) return -1;
      if (b.diasRestantes !== null) return 1;
      return 0;
    });

  const anunciosSidebar: AnuncioSidebar[] = anuncios.map((a) => ({
    id: a.id,
    titulo: a.titulo,
    cuerpo: a.cuerpo,
    courseId: a.courseId,
    cursoTitulo: tituloPorCurso.get(a.courseId) ?? "",
    fecha: a.createdAt,
    autor: `${a.tutor.nombre} ${a.tutor.apellido}`.trim(),
  }));

  const calificacionesSidebar: CalificacionSidebar[] = calificadas.map((e) => ({
    id: e.actividad.id,
    titulo: e.actividad.titulo,
    courseId: e.actividad.courseId,
    cursoTitulo: tituloPorCurso.get(e.actividad.courseId) ?? "",
    porcentaje: porcentajeDeNota(e.nota ?? 0, e.actividad.puntajeMaximo),
    retroalimentacion: e.retroalimentacion,
    fecha: e.calificadaEn as Date,
  }));

  // Procesamos cada curso con sus métricas
  const cursosConMetricas = inscripciones.map((inscripcion) => {
    const estado = obtenerEstadoEstudiante(inscripcion.course.estado);

    type ContenidoDelCurso = (typeof inscripcion.course.contenidos)[number];
    type SeccionDelCurso = (typeof inscripcion.course.secciones)[number];

    const lecciones = ordenarLecciones<ContenidoDelCurso, SeccionDelCurso>(
      filtrarContenidosAccesibles<ContenidoDelCurso, SeccionDelCurso>(
        inscripcion.course.contenidos,
        inscripcion.course.secciones
      ),
      inscripcion.course.secciones
    );
    const totalContenidos = lecciones.length;
    const contenidosVistos = lecciones.filter((leccion) => idsVistos.has(leccion.id)).length;
    const progreso = calcularProgreso(contenidosVistos, totalContenidos);
    const completado = progreso === 100 && totalContenidos > 0;
    const leccionParaContinuar = siguienteLeccionPendiente(lecciones, idsVistos);

    const indiceLeccion = leccionParaContinuar
      ? lecciones.findIndex((l) => l.id === leccionParaContinuar.id) + 1
      : 1;

    return {
      id: inscripcion.id,
      courseId: inscripcion.course.id,
      href: `/estudiante/cursos/${inscripcion.course.id}`,
      hrefContinuar: leccionParaContinuar
        ? `/estudiante/cursos/${inscripcion.course.id}/lecciones/${leccionParaContinuar.id}`
        : `/estudiante/cursos/${inscripcion.course.id}`,
      titulo: inscripcion.course.titulo,
      imagen: inscripcion.course.imagen,
      tutor: inscripcion.course.tutor,
      estadoLabel: estado.label,
      progreso,
      contenidosVistos,
      totalContenidos,
      completado,
      leccionPendiente: leccionParaContinuar
        ? {
            id: leccionParaContinuar.id,
            titulo: leccionParaContinuar.titulo,
            tipo: leccionParaContinuar.tipo,
            numero: indiceLeccion,
          }
        : null,
    };
  });

  const totalCursos = cursosConMetricas.length;
  const cursosCompletados = cursosConMetricas.filter((c) => c.completado).length;
  const totalTemasVistos = vistas.length;
  const progresoPromedio =
    totalCursos > 0
      ? Math.round(cursosConMetricas.reduce((acc, c) => acc + c.progreso, 0) / totalCursos)
      : 0;

  // Encontrar el curso prioritario para "Continuar Aprendiendo" (Estilo Platzi)
  const cursoEnProgreso =
    cursosConMetricas.find((c) => !c.completado && c.progreso > 0) ||
    cursosConMetricas.find((c) => !c.completado && c.totalContenidos > 0);

  const infoTipoLeccion = cursoEnProgreso?.leccionPendiente?.tipo
    ? ICONO_POR_TIPO[cursoEnProgreso.leccionPendiente.tipo as TipoContenidoConIcono]
    : null;
  const IconoTipo = infoTipoLeccion?.Icon || PlayCircle;

  return (
    <AppShell usuario={usuarioActual} breadcrumbs={[{ label: "Mis cursos" }]}>
      <main className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 py-8">
        {/* BANNER DE BIENVENIDA Y RACHA */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider">
                  {usuarioActual.grado ? `Grado ${usuarioActual.grado}` : "Estudiante"}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-primary font-medium">
                  <Sparkles className="size-3.5" /> Campus Activo
                </span>
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                ¡Hola, {usuarioActual.nombre}! 👋
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {racha > 0
                  ? `¡Excelente ritmo! Mantienes una racha de ${racha} ${
                      racha === 1 ? "día consecutivo" : "días consecutivos"
                    }. Sigue aprendiendo y alcanzando tus metas hoy.`
                  : "Bienvenido a tu aula virtual. Revisa tus lecciones pendientes y continúa desarrollando tus habilidades tecnológicas."}
              </p>
            </div>

            {/* Widget de Racha y Acciones rápidas */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {racha > 0 ? (
                <div
                  className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-duo-orange to-amber-500 px-5 py-3 shadow-[0_4px_0_var(--duo-orange-shadow)] text-white"
                  title="Días consecutivos de actividad"
                >
                  <Flame className="size-7 animate-flame-pulse fill-white drop-shadow" />
                  <div className="flex flex-col">
                    <span className="text-xl font-extrabold leading-none">{racha}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-95">
                      {racha === 1 ? "Día de racha" : "Días de racha"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-2xl border border-border/80 bg-background/50 px-4 py-2.5 text-xs text-muted-foreground">
                  <Flame className="size-5 text-muted-foreground/50" />
                  <span>Completa una lección hoy para iniciar tu racha</span>
                </div>
              )}

              <Link
                href="/estudiante/buscar"
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border/80 bg-card px-4 text-xs font-semibold text-foreground transition-all hover:bg-muted hover:border-primary/40 shadow-xs"
              >
                <Search className="size-4 text-muted-foreground" />
                Buscar
              </Link>
            </div>
          </div>
        </div>

        {/* RESUMEN DE MÉTRICAS RÁPIDAS (KPIs) */}
        {totalCursos > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Inscripciones</p>
                <p className="font-heading text-xl font-bold text-foreground">
                  {totalCursos} {totalCursos === 1 ? "curso" : "cursos"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
                <Trophy className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Completados</p>
                <p className="font-heading text-xl font-bold text-emerald-500">
                  {cursosCompletados} de {totalCursos}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Temas vistos</p>
                <p className="font-heading text-xl font-bold text-foreground">{totalTemasVistos}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Progreso global</p>
                <p className="font-heading text-xl font-bold text-foreground">{progresoPromedio}%</p>
              </div>
            </div>
          </div>
        )}

        {/* LAYOUT PRINCIPAL DE 2 COLUMNAS (CANVAS + PLATZI) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA PRINCIPAL IZQUIERDA (lg:col-span-8) */}
          <section className="lg:col-span-8 space-y-8">
            {/* TARJETA DESTACADA: "CONTINUAR APRENDIENDO" (Estilo Platzi) */}
            {cursoEnProgreso && (
              <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-card via-card to-primary/5 p-6 shadow-md transition-all hover:border-primary/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary uppercase tracking-wide">
                        <PlayCircle className="size-3.5" />
                        Continuar donde lo dejaste
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {cursoEnProgreso.contenidosVistos} de {cursoEnProgreso.totalContenidos} lecciones
                      </span>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                        {cursoEnProgreso.titulo}
                      </span>
                      <h2 className="font-heading text-xl font-bold text-foreground mt-0.5 line-clamp-1">
                        {cursoEnProgreso.leccionPendiente
                          ? `Lección ${cursoEnProgreso.leccionPendiente.numero}: ${cursoEnProgreso.leccionPendiente.titulo}`
                          : cursoEnProgreso.titulo}
                      </h2>
                    </div>

                    {/* Barra de progreso */}
                    <div className="space-y-1.5 max-w-md">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <IconoTipo className="size-3.5 text-primary" />
                          {infoTipoLeccion?.etiqueta || "Lección"} en curso
                        </span>
                        <span className="text-primary font-bold">{cursoEnProgreso.progreso}%</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-700"
                          style={{ width: `${cursoEnProgreso.progreso}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <Link
                      href={cursoEnProgreso.hrefContinuar}
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "h-12 px-6 rounded-xl font-bold shadow-sm gap-2 w-full sm:w-auto"
                      )}
                    >
                      <PlayCircle className="size-5 fill-current" />
                      Reanudar lección
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* LISTADO DE CURSOS CON PESTAÑAS Y BUSCADOR */}
            <div className="space-y-4">
              <div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                  Mis Cursos
                </h2>
                <p className="text-xs text-muted-foreground">
                  Accede al contenido, lecciones y materiales de tus asignaturas activas.
                </p>
              </div>

              <StudentCoursesList cursos={cursosConMetricas} />
            </div>
          </section>

          {/* COLUMNA LATERAL DERECHA (lg:col-span-4) - ESTILO CANVAS */}
          <div className="lg:col-span-4">
            <StudentSidebarTodo
              tareas={tareasPendientes}
              anuncios={anunciosSidebar}
              calificaciones={calificacionesSidebar}
            />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
