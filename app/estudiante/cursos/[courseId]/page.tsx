import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  Inbox,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ClipboardList,
  ListChecks,
  Lock,
  BookOpen,
  GraduationCap,
  PlayCircle,
  Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MarkdownContent } from "@/components/markdown-content";
import { SubmitActivityForm } from "@/components/submit-activity-form";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { LessonRow } from "@/components/lesson-row";
import { calcularProgreso } from "@/lib/course-progress";
import {
  filtrarContenidosAccesibles,
  ordenarLecciones,
  siguienteLeccionPendiente,
} from "@/lib/course-lessons";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * US43 (20/11/2026) — esta página pasó de "el curso entero desplegado" a
 * "el temario del curso".
 *
 * Antes mostraba, una debajo de otra, todas las lecciones con su video
 * embebido, su texto completo en Markdown y su lista de documentos
 * firmados. Funcionaba, pero el docente lo vio y dijo lo que había que
 * oír: "no se me parece a un LMS, es muy básico" y, al sembrar un curso de
 * prueba con todos los recursos, "es lo mismo que ya había subido". El
 * problema era la forma: un curso que se lee como un artículo largo.
 *
 * Ahora esta pantalla responde tres preguntas de un vistazo —¿qué trae el
 * curso?, ¿cuánto llevo?, ¿por dónde sigo?— y el contenido se estudia en
 * el reproductor (`lecciones/[contenidoId]`), una lección a la vez.
 *
 * La consulta a Prisma quedó igual a propósito: cambia la presentación, no
 * los datos ni las reglas de acceso (US11 + US30).
 */
export default async function CursoEstudiantePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

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

  const curso = await prisma.courses.findUnique({
    where: { id: courseId },
    include: {
      // OP08 (21/11/2026): el docente pidió que al estudiante le quede claro
      // con qué profesor está inscrito — "y si es con varios, poderse
      // identificar de manera más fácil". El nombre ya salía en la tarjeta de
      // "Mis cursos", pero no dentro del curso, que es donde pasa el tiempo.
      tutor: { select: { nombre: true, apellido: true } },
      contenidos: {
        orderBy: { orden: "asc" },
        include: { documentos: true },
      },
      // US30: secciones plegables del curso, con su estado (fijado a mano
      // por el Tutor) y la marca opcional de "semana actual".
      secciones: {
        orderBy: { orden: "asc" },
      },
      // Actividades evaluables (19/11/2026). Solo las visibles, mismo
      // criterio que ya se aplica al contenido, y de cada una se trae
      // únicamente la entrega de este estudiante: las de sus compañeros no
      // deben salir nunca de la pantalla del tutor.
      actividades: {
        where: { visible: true },
        orderBy: { orden: "asc" },
        include: {
          entregas: { where: { userId: usuarioActual.id } },
        },
      },
      // Evaluaciones automáticas publicadas, con los intentos de este
      // estudiante. Aquí no se traen las preguntas ni las opciones: esta
      // pantalla solo enlaza al quiz, y la respuesta correcta nunca debe
      // salir del servidor.
      quizzes: {
        where: { visible: true },
        orderBy: { orden: "asc" },
        include: {
          _count: { select: { preguntas: true } },
          intentos: {
            where: { userId: usuarioActual.id },
            orderBy: { puntaje: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!curso) {
    notFound();
  }

  // Un estudiante solo puede ver el contenido de cursos donde está
  // inscrito (US11): sin esta verificación, cualquier estudiante con
  // sesión activa podría entrar a cualquier curso adivinando su id.
  const inscripcion = await prisma.courseUsers.findFirst({
    where: { courseId: curso.id, userId: usuarioActual.id },
  });

  if (!inscripcion) {
    notFound();
  }

  // US30 + US43: el criterio de "qué puede ver el Estudiante" vive en
  // `lib/course-lessons.ts`, compartido con el reproductor y con la acción
  // que marca una lección — antes estaba escrito a mano aquí mismo.
  type ContenidoDelCurso = (typeof curso.contenidos)[number];
  type SeccionDelCurso = (typeof curso.secciones)[number];

  const contenidosVisibles = filtrarContenidosAccesibles<ContenidoDelCurso, SeccionDelCurso>(
    curso.contenidos,
    curso.secciones
  );
  const lecciones = ordenarLecciones<ContenidoDelCurso, SeccionDelCurso>(
    contenidosVisibles,
    curso.secciones
  );

  // US19: "visto" solo cuenta cuando el estudiante lo confirma; aquí se
  // consulta qué confirmó antes para pintar los visto-buenos del temario.
  const vistos =
    contenidosVisibles.length === 0
      ? []
      : await prisma.contentViews.findMany({
          where: {
            userId: usuarioActual.id,
            contentId: { in: contenidosVisibles.map((contenido) => contenido.id) },
          },
          select: { contentId: true },
        });

  const idsVistos = new Set<string>(vistos.map((visto) => visto.contentId));

  // US31: resumen de avance del curso.
  const progreso = calcularProgreso(idsVistos.size, lecciones.length);

  // US43: por dónde retomar. La primera lección sin completar, o la primera
  // del curso si ya terminó todo (para repasar).
  const leccionParaContinuar = siguienteLeccionPendiente<ContenidoDelCurso>(lecciones, idsVistos);
  const esRepaso = progreso === 100;
  const esComienzo = idsVistos.size === 0;

  const numeroPorContenido = new Map(
    lecciones.map((leccion, posicion) => [leccion.id, posicion + 1])
  );

  const leccionesSueltas = lecciones.filter((leccion) => leccion.seccionId === null);

  return (
    <AppShell
      usuario={usuarioActual}
      breadcrumbs={[{ label: "Mis cursos", href: "/estudiante" }, { label: curso.titulo }]}
    >
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        {/* CABECERA DEL CURSO */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/estudiante"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "min-h-11 gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                )}
              >
                <ArrowLeft className="size-4" />
                Volver a Mis Cursos
              </Link>

              <Badge
                variant={progreso === 100 ? "success" : "default"}
                className="text-xs font-semibold"
              >
                {progreso}% completado
              </Badge>
            </div>

            <div className="space-y-2">
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {curso.titulo}
              </h1>
              {curso.descripcion && (
                <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
                  {curso.descripcion}
                </p>
              )}
              {curso.tutor && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <GraduationCap className="size-4 text-primary" aria-hidden="true" />
                  Docente: {curso.tutor.nombre} {curso.tutor.apellido}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-border/60 pt-2 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-4 text-primary" />
                {lecciones.length} {lecciones.length === 1 ? "lección" : "lecciones"}
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="size-4 text-muted-foreground" />
                {curso.secciones.length}{" "}
                {curso.secciones.length === 1 ? "módulo / semana" : "módulos / semanas"}
              </span>
              <span className="flex items-center gap-1.5">
                <ClipboardList className="size-4 text-muted-foreground" />
                {curso.actividades.length}{" "}
                {curso.actividades.length === 1 ? "actividad" : "actividades"}
              </span>
              <span className="flex items-center gap-1.5">
                <ListChecks className="size-4 text-muted-foreground" />
                {curso.quizzes.length}{" "}
                {curso.quizzes.length === 1 ? "evaluación" : "evaluaciones"}
              </span>
            </div>
          </div>
        </div>

        {/* CONTINUAR / COMENZAR — US43 */}
        {leccionParaContinuar && (
          <div className="rounded-3xl border border-primary/30 bg-card p-6 shadow-md transition-colors hover:border-primary/60">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold tracking-wide text-primary uppercase">
                  <PlayCircle className="size-3.5" />
                  {esComienzo ? "Comenzar el curso" : esRepaso ? "Repasar" : "Continuar donde quedaste"}
                </span>

                <h2 className="font-heading text-xl font-bold text-foreground">
                  Lección {numeroPorContenido.get(leccionParaContinuar.id)}:{" "}
                  {leccionParaContinuar.titulo}
                </h2>

                <div className="max-w-md space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">
                      {idsVistos.size} de {lecciones.length} completadas
                    </span>
                    <span className="text-primary">{progreso}%</span>
                  </div>
                  <Progress
                    value={progreso}
                    variant={progreso === 100 ? "success" : "default"}
                    aria-label={`Avance del curso ${curso.titulo}`}
                  />
                </div>
              </div>

              <Link
                href={`/estudiante/cursos/${curso.id}/lecciones/${leccionParaContinuar.id}`}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "shrink-0 gap-2 self-start font-bold sm:self-center"
                )}
              >
                {esComienzo ? "Empezar" : esRepaso ? "Repasar" : "Continuar"}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        )}

        {lecciones.length === 0 && curso.secciones.length === 0 ? (
          <EmptyState icon={Inbox} message="Este curso todavía no tiene contenido publicado." />
        ) : (
          <section className="space-y-6">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">Temario</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Entra a cada lección para verla y confírmala al terminar; tu avance se guarda
                solo.
              </p>
            </div>

            {/* MÓDULOS / SEMANAS */}
            {curso.secciones.map((seccion) => {
              const leccionesDeSeccion = lecciones.filter(
                (leccion) => leccion.seccionId === seccion.id
              );
              const vistasEnSeccion = leccionesDeSeccion.filter((leccion) =>
                idsVistos.has(leccion.id)
              ).length;

              return (
                <div
                  key={seccion.id}
                  className="space-y-4 rounded-3xl border border-border/80 bg-card/60 p-5 shadow-xs sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Calendar className="size-4" />
                      </span>
                      <span className="font-heading text-xl font-bold text-foreground">
                        {seccion.titulo}
                      </span>
                      {seccion.esActual && <Badge variant="success">Semana actual</Badge>}
                      {seccion.estado === "NO_DISPONIBLE" && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="size-3" /> No disponible
                        </Badge>
                      )}
                    </div>

                    {seccion.estado !== "NO_DISPONIBLE" && leccionesDeSeccion.length > 0 && (
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                        {vistasEnSeccion} de {leccionesDeSeccion.length} completadas
                      </span>
                    )}
                  </div>

                  {seccion.estado === "NO_DISPONIBLE" ? (
                    <p className="rounded-2xl border border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground">
                      Esta sección todavía no está disponible — tu docente la habilitará según el
                      avance de la clase.
                    </p>
                  ) : leccionesDeSeccion.length === 0 ? (
                    <p className="rounded-2xl border border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground">
                      Esta sección todavía no tiene lecciones publicadas.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {leccionesDeSeccion.map((leccion) => (
                        <LessonRow
                          key={leccion.id}
                          href={`/estudiante/cursos/${curso.id}/lecciones/${leccion.id}`}
                          numero={numeroPorContenido.get(leccion.id) ?? 0}
                          titulo={leccion.titulo}
                          descripcion={leccion.descripcion}
                          tipo={leccion.tipo}
                          visto={idsVistos.has(leccion.id)}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

            {/* CONTENIDO SIN SECCIÓN */}
            {leccionesSueltas.length > 0 && (
              <div className="space-y-4 rounded-3xl border border-border/80 bg-card/60 p-5 shadow-xs sm:p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpen className="size-4" />
                  </span>
                  <span className="font-heading text-xl font-bold text-foreground">
                    Contenidos generales del curso
                  </span>
                </div>

                <ul className="space-y-2">
                  {leccionesSueltas.map((leccion) => (
                    <LessonRow
                      key={leccion.id}
                      href={`/estudiante/cursos/${curso.id}/lecciones/${leccion.id}`}
                      numero={numeroPorContenido.get(leccion.id) ?? 0}
                      titulo={leccion.titulo}
                      descripcion={leccion.descripcion}
                      tipo={leccion.tipo}
                      visto={idsVistos.has(leccion.id)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* ACTIVIDADES EVALUABLES (19/11/2026) */}
        <section className="space-y-4 border-t border-border/60 pt-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" aria-hidden="true" />
            <h2 className="font-heading text-xl font-bold text-foreground">Actividades</h2>
          </div>

          {curso.actividades.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              message="Este curso todavía no tiene actividades para entregar."
            />
          ) : (
            <ul className="space-y-4">
              {curso.actividades.map((actividad) => {
                const entrega = actividad.entregas[0] ?? null;
                const calificada = entrega?.nota !== null && entrega !== null;

                return (
                  <li
                    key={actividad.id}
                    className="space-y-4 rounded-2xl border border-border/80 bg-card p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <h3 className="font-heading text-base font-bold text-foreground">
                          {actividad.titulo}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {actividad.puntajeMaximo} puntos
                          {actividad.fechaLimite
                            ? ` · entrega hasta el ${actividad.fechaLimite.toLocaleDateString("es-CO")}`
                            : ""}
                        </p>
                      </div>

                      <Badge
                        variant={calificada ? "success" : entrega ? "secondary" : "warning"}
                        className="font-semibold"
                      >
                        {calificada
                          ? `${entrega!.nota} / ${actividad.puntajeMaximo}`
                          : entrega
                            ? "Entregada"
                            : "Pendiente"}
                      </Badge>
                    </div>

                    {actividad.descripcion && (
                      <p className="text-sm text-muted-foreground">{actividad.descripcion}</p>
                    )}

                    <MarkdownContent contenido={actividad.instrucciones} />

                    {entrega?.retroalimentacion && (
                      <div className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm">
                        <p className="font-semibold text-success">Comentario de tu profesor</p>
                        <p className="whitespace-pre-wrap text-foreground">
                          {entrega.retroalimentacion}
                        </p>
                      </div>
                    )}

                    <SubmitActivityForm
                      actividadId={actividad.id}
                      titulo={actividad.titulo}
                      yaEntregada={entrega !== null}
                      textoPrevio={entrega?.texto}
                      nombreArchivoPrevio={entrega?.nombreArchivo}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* EVALUACIONES AUTOMÁTICAS (19/11/2026) */}
        {curso.quizzes.length > 0 && (
          <section className="space-y-4 border-t border-border/60 pt-6">
            <div className="flex items-center gap-2">
              <ListChecks className="size-5 text-primary" aria-hidden="true" />
              <h2 className="font-heading text-xl font-bold text-foreground">Evaluaciones</h2>
            </div>

            <ul className="space-y-3">
              {curso.quizzes.map((quiz) => {
                const mejor = quiz.intentos[0] ?? null;

                return (
                  <li key={quiz.id}>
                    <Link
                      href={`/estudiante/cursos/${curso.id}/quizzes/${quiz.id}`}
                      className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 transition-colors hover:border-primary/40"
                    >
                      <div className="space-y-0.5">
                        <p className="font-heading text-base font-bold text-foreground transition-colors group-hover:text-primary">
                          {quiz.titulo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {quiz._count.preguntas}{" "}
                          {quiz._count.preguntas === 1 ? "pregunta" : "preguntas"} · se califica al
                          instante
                          {/* OP08: si el tutor puso tope, que se sepa antes de entrar. */}
                          {quiz.intentosMaximos
                            ? ` · máximo ${quiz.intentosMaximos} ${
                                quiz.intentosMaximos === 1 ? "intento" : "intentos"
                              }`
                            : ""}
                        </p>
                      </div>

                      <Badge
                        variant={mejor ? (mejor.puntaje >= 60 ? "success" : "warning") : "secondary"}
                        className="font-semibold"
                      >
                        {mejor ? `Tu mejor: ${mejor.puntaje}%` : "Sin responder"}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </AppShell>
  );
}
