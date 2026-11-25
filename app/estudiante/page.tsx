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
import {
  DIAS_DE_VENTANA,
  DIAS_DE_AVISO_DE_PLAZO,
  diasHasta,
  ordenarNovedades,
  proximosDias,
  type Novedad,
} from "@/lib/novedades";
import { NewsFeed } from "@/components/news-feed";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { CourseCard } from "@/components/course-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
            // US43: además del id hacen falta `seccionId` y el orden para
            // poder calcular la lección exacta por la que el estudiante
            // retoma el curso — "Reanudar clase" ahora entra directo al
            // reproductor, no a la portada del curso. `visible` viaja
            // porque `filtrarContenidosAccesibles` lo exige, aunque el
            // `where` ya lo garantice.
            contenidos: {
              where: { visible: true },
              orderBy: { orden: "asc" },
              select: { id: true, visible: true, seccionId: true },
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

  // NOVEDADES (22/11/2026) — ver `lib/novedades.ts` para por qué es una
  // ventana de tiempo y no un estado leído/no leído.
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

  const [calificadas, actividadesAbiertas, leccionesNuevas, evaluacionesNuevas, anuncios] =
    idsCursos.length
    ? await Promise.all([
        prisma.entregas.findMany({
          where: {
            userId: usuarioActual.id,
            calificadaEn: { gte: desde },
            actividad: { courseId: { in: idsCursos } },
          },
          select: {
            nota: true,
            retroalimentacion: true,
            calificadaEn: true,
            actividad: { select: { id: true, titulo: true, courseId: true, puntajeMaximo: true } },
          },
        }),
        // Para el aviso de plazo: actividades visibles con fecha límite
        // próxima. Se piden todas las del rango y se descartan después las
        // que el estudiante ya entregó.
        prisma.actividades.findMany({
          where: {
            courseId: { in: idsCursos },
            visible: true,
            fechaLimite: { not: null, lte: proximosDias(ahora, DIAS_DE_AVISO_DE_PLAZO) },
          },
          select: {
            id: true,
            titulo: true,
            courseId: true,
            fechaLimite: true,
            entregas: { where: { userId: usuarioActual.id }, select: { id: true } },
          },
        }),
        prisma.contents.findMany({
          where: { courseId: { in: idsCursos }, visible: true, createdAt: { gte: desde } },
          select: { id: true, titulo: true, courseId: true, createdAt: true },
        }),
        prisma.quizzes.findMany({
          where: { courseId: { in: idsCursos }, visible: true, createdAt: { gte: desde } },
          select: { id: true, titulo: true, courseId: true, createdAt: true },
        }),
        // US53 (25/11/2026): los anuncios del docente, dentro de la misma
        // ventana de dos semanas que el resto de las novedades.
        prisma.anuncios.findMany({
          where: { courseId: { in: idsCursos }, createdAt: { gte: desde } },
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
    : [[], [], [], [], []];

  const novedades = ordenarNovedades([
    // US53: primero los anuncios — ver `lib/novedades.ts` para por qué van
    // arriba de todo.
    ...anuncios.map(
      (a: {
        id: string;
        titulo: string;
        cuerpo: string;
        courseId: string;
        createdAt: Date;
        tutor: { nombre: string; apellido: string };
      }): Novedad => ({
        tipo: "anuncio",
        cursoId: a.courseId,
        cursoTitulo: tituloPorCurso.get(a.courseId) ?? "",
        titulo: a.titulo,
        href: `/estudiante/cursos/${a.courseId}`,
        fecha: a.createdAt,
        cuerpo: a.cuerpo,
        autor: `${a.tutor.nombre} ${a.tutor.apellido}`.trim(),
      })
    ),
    ...actividadesAbiertas
      .filter((a: { entregas: unknown[] }) => a.entregas.length === 0)
      .map(
        (a: {
          id: string;
          titulo: string;
          courseId: string;
          fechaLimite: Date | null;
        }): Novedad => ({
          tipo: "plazo",
          cursoId: a.courseId,
          cursoTitulo: tituloPorCurso.get(a.courseId) ?? "",
          titulo: a.titulo,
          href: `/estudiante/cursos/${a.courseId}`,
          fecha: a.fechaLimite as Date,
          diasRestantes: diasHasta(a.fechaLimite as Date, ahora),
        })
      ),
    ...calificadas.map(
      (e: {
        nota: number | null;
        retroalimentacion: string | null;
        calificadaEn: Date | null;
        actividad: { id: string; titulo: string; courseId: string; puntajeMaximo: number };
      }): Novedad => ({
        tipo: "nota",
        cursoId: e.actividad.courseId,
        cursoTitulo: tituloPorCurso.get(e.actividad.courseId) ?? "",
        titulo: e.actividad.titulo,
        href: "/estudiante/notas",
        fecha: e.calificadaEn as Date,
        porcentaje: porcentajeDeNota(e.nota ?? 0, e.actividad.puntajeMaximo),
        retroalimentacion: e.retroalimentacion,
      })
    ),
    ...leccionesNuevas.map(
      (c: { id: string; titulo: string; courseId: string; createdAt: Date }): Novedad => ({
        tipo: "material",
        cursoId: c.courseId,
        cursoTitulo: tituloPorCurso.get(c.courseId) ?? "",
        titulo: c.titulo,
        href: `/estudiante/cursos/${c.courseId}/lecciones/${c.id}`,
        fecha: c.createdAt,
        clase: "leccion",
      })
    ),
    ...evaluacionesNuevas.map(
      (q: { id: string; titulo: string; courseId: string; createdAt: Date }): Novedad => ({
        tipo: "material",
        cursoId: q.courseId,
        cursoTitulo: tituloPorCurso.get(q.courseId) ?? "",
        titulo: q.titulo,
        href: `/estudiante/cursos/${q.courseId}/quizzes/${q.id}`,
        fecha: q.createdAt,
        clase: "evaluacion",
      })
    ),
  ]);

  // Procesamos cada curso con sus métricas
  const cursosConMetricas = inscripciones.map((inscripcion) => {
    const estado = obtenerEstadoEstudiante(inscripcion.course.estado);

    // US43: el avance se cuenta sobre las lecciones que el estudiante
    // realmente puede abrir — el contenido de una sección "No disponible"
    // no debería inflar el denominador y dejar el curso en un 60% eterno.
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

    return {
      id: inscripcion.id,
      courseId: inscripcion.course.id,
      href: `/estudiante/cursos/${inscripcion.course.id}`,
      // "Reanudar clase" entra directo a la lección pendiente; si el curso
      // todavía no tiene lecciones accesibles, cae en el temario.
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
    };
  });

  const totalCursos = cursosConMetricas.length;
  const cursosCompletados = cursosConMetricas.filter((c) => c.completado).length;
  const totalTemasVistos = vistas.length;
  const progresoPromedio =
    totalCursos > 0
      ? Math.round(cursosConMetricas.reduce((acc, c) => acc + c.progreso, 0) / totalCursos)
      : 0;

  // Encontrar el curso prioritario para "Continuar Aprendiendo"
  const cursoEnProgreso =
    cursosConMetricas.find((c) => !c.completado && c.progreso > 0) ||
    cursosConMetricas.find((c) => !c.completado && c.totalContenidos > 0);

  return (
    <AppShell usuario={usuarioActual} breadcrumbs={[{ label: "Mis cursos" }]}>
      <main className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 py-8">
        {/* BANNER DE BIENVENIDA Y RACHA */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
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
                  ? `¡Gran constancia! Mantienes una racha de ${racha} ${
                      racha === 1 ? "día" : "días"
                    } consecutivos. Continúa con tus metas de aprendizaje hoy.`
                  : "Bienvenido a tu aula virtual. Revisa tus lecciones pendientes y sigue dominando nuevas habilidades tecnológicas."}
              </p>
            </div>

            {/* Widget de Racha y Acciones rápidas */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {racha > 0 ? (
                <div
                  className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-duo-orange to-duo-gold px-5 py-3 shadow-[0_4px_0_var(--duo-orange-shadow)] text-white"
                  title="Días consecutivos con actividad educativa"
                >
                  <Flame className="size-7 animate-flame-pulse fill-white drop-shadow" />
                  <div className="flex flex-col">
                    <span className="text-xl font-extrabold leading-none">{racha}</span>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                      {racha === 1 ? "Día de racha" : "Días de racha"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
                  <Flame className="size-5 text-muted-foreground/60" />
                  <span>Completa una lección para activar tu racha diaria</span>
                </div>
              )}

              <Link
                href="/estudiante/buscar"
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border/80 bg-card px-4 text-xs font-semibold text-foreground transition-all hover:bg-muted hover:border-primary/40 shadow-xs"
              >
                <Search className="size-4 text-muted-foreground" />
                Buscar cursos
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
                <Trophy className="size-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Completados</p>
                <p className="font-heading text-xl font-bold text-success">
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
                <p className="text-xs text-muted-foreground font-medium">Progreso general</p>
                <p className="font-heading text-xl font-bold text-foreground">{progresoPromedio}%</p>
              </div>
            </div>
          </div>
        )}

        {/* NOVEDADES — va antes de "Continuar aprendiendo" porque lo que
            vence pronto pesa más que seguir donde se quedó. */}
        <NewsFeed novedades={novedades} />

        {/* TARJETA DESTACADA: "CONTINUAR APRENDIENDO" */}
        {cursoEnProgreso && (
          <div className="rounded-2xl border border-primary/30 bg-card p-6 shadow-md transition-all hover:border-primary/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary uppercase tracking-wide">
                    <PlayCircle className="size-3.5" />
                    Continuar donde lo dejaste
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {cursoEnProgreso.contenidosVistos} de {cursoEnProgreso.totalContenidos} lecciones
                  </span>
                </div>

                <h2 className="font-heading text-xl font-bold text-foreground">
                  {cursoEnProgreso.titulo}
                </h2>

                {cursoEnProgreso.tutor && (
                  <p className="text-xs text-muted-foreground">
                    Docente: {cursoEnProgreso.tutor.nombre} {cursoEnProgreso.tutor.apellido}
                  </p>
                )}

                {/* Barra de progreso visual */}
                <div className="space-y-1.5 max-w-md">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Avance del curso</span>
                    <span className="text-primary">{cursoEnProgreso.progreso}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${cursoEnProgreso.progreso}%` }}
                    />
                  </div>
                </div>
              </div>

              <Link href={cursoEnProgreso.hrefContinuar} className={cn(buttonVariants(), "h-12 px-6 rounded-2xl font-bold shadow-sm gap-2 shrink-0 self-start sm:self-center")}>
                  Reanudar clase
                  <ArrowRight className="size-4" />
                </Link>
            </div>
          </div>
        )}

        {/* LISTADO DE CURSOS */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                Mis Cursos
              </h2>
              <p className="text-xs text-muted-foreground">
                Todos tus cursos activos, asignaciones y material didáctico.
              </p>
            </div>

            {totalCursos > 0 && (
              <Badge variant="outline" className="font-semibold text-xs">
                {totalCursos} {totalCursos === 1 ? "curso disponible" : "cursos disponibles"}
              </Badge>
            )}
          </div>

          {totalCursos === 0 ? (
            <EmptyState icon={BookOpen} message="Todavía no estás inscrito en ningún curso." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cursosConMetricas.map((curso, index) => (
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
        </section>
      </main>
    </AppShell>
  );
}
