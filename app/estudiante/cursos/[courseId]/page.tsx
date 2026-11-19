import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  Inbox,
  ArrowLeft,
  Calendar,
  ClipboardList,
  ListChecks,
  Lock,
  BookOpen,
  Sparkles,
  Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { MarkdownContent } from "@/components/markdown-content";
import { DocumentContentList } from "@/components/document-content-list";
import { SubmitActivityForm } from "@/components/submit-activity-form";
import { crearUrlDescarga } from "@/lib/supabase/storage";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { CourseContentItem } from "@/components/course-content-item";
import { CourseContentOutline } from "@/components/course-content-outline";
import { calcularProgreso } from "@/lib/course-progress";
import { agruparContenidoPorSeccion, contenidoSinSeccion } from "@/lib/group-content-by-section";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  // US30: el mapa de estado por sección decide, además de `visible`, si un
  // contenido cuenta como accesible — el contenido de una sección "No
  // disponible" queda tan oculto para el Estudiante como uno con
  // `visible: false` (ni aparece en la lista, ni cuenta para el avance),
  // hasta que el Tutor la marque Disponible. El contenido sin sección nunca
  // se ve afectado por esto.
  const estadoPorSeccion = new Map(curso.secciones.map((seccion) => [seccion.id, seccion.estado]));
  const contenidosVisibles = curso.contenidos.filter((contenido) => {
    if (!contenido.visible) {
      return false;
    }

    if (contenido.seccionId && estadoPorSeccion.get(contenido.seccionId) === "NO_DISPONIBLE") {
      return false;
    }

    return true;
  });

  // US19 (rediseño): "visto" ya no se marca solo con abrir esta página —
  // hace falta la confirmación del estudiante al pulsar el botón correspondiente.
  // US19 (rediseño): el contenido ya NO se marca como visto automáticamente
  // al abrir la página — eso marcaba TODOS los contenidos a la vez sin que
  // el estudiante interactuara con ninguno, porque todos se muestran juntos
  // en la misma página. Ahora hace falta el clic del estudiante en
  // <MarkContentViewedButton>; aquí solo se consulta cuáles ya están
  // marcados, para no mostrarle el botón a algo que ya confirmó antes.
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

  const idsVistos = new Set(vistos.map((visto) => visto.contentId));

  // US31: resumen de avance mostrado en la barra lateral del aula.
  const progreso = calcularProgreso(idsVistos.size, contenidosVisibles.length);

  // Las URLs de descarga son firmadas y de corta duración (US09/US16), así
  // que se generan en cada carga de la página en vez de guardarse.
  const contenidosConDocumentos = await Promise.all(
    contenidosVisibles.map(async (contenido) => {
      if (contenido.tipo !== "DOCUMENTO") {
        return { ...contenido, documentosConUrl: [] };
      }

      const documentosConUrl = await Promise.all(
        contenido.documentos.map(async (documento) => ({
          ...documento,
          url: await crearUrlDescarga(documento.archivo),
        }))
      );

      return { ...contenido, documentosConUrl };
    })
  );

  // Agrupamiento por secciones y contenido suelto
  const gruposDeSeccion = agruparContenidoPorSeccion(contenidosConDocumentos, [...curso.secciones]);
  const contenidoSueltoEstudiante = contenidoSinSeccion(contenidosConDocumentos);
  const numeroPorContenido = new Map(
    contenidosConDocumentos.map((contenido, index) => [contenido.id, index + 1])
  );

  return (
    <AppShell
      usuario={usuarioActual}
      breadcrumbs={[{ label: "Mis cursos", href: "/estudiante" }, { label: curso.titulo }]}
    >
      <main className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 py-8">
        {/* CABECERA PRINCIPAL DEL CURSO (AULA Y RUTA) */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-duo-blue/10 p-6 sm:p-8 shadow-xs">
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

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-semibold text-xs">
                  <Sparkles className="size-3 mr-1 text-primary" />
                  Ruta de Aprendizaje
                </Badge>
                <Badge
                  variant={progreso === 100 ? "success" : "default"}
                  className="font-semibold text-xs"
                >
                  {progreso}% completado
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {curso.titulo}
              </h1>
              {curso.descripcion && (
                <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
                  {curso.descripcion}
                </p>
              )}
            </div>

            {/* Fila de métricas rápidas del curso */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/60 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-4 text-primary" />
                {contenidosVisibles.length}{" "}
                {contenidosVisibles.length === 1 ? "lección disponible" : "lecciones disponibles"}
              </span>
              <span className="flex items-center gap-1.5">
                <Layers className="size-4 text-duo-blue" />
                {curso.secciones.length}{" "}
                {curso.secciones.length === 1 ? "módulo / semana" : "módulos / semanas"}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="size-4 text-duo-green" />
                {idsVistos.size} de {contenidosVisibles.length} temas completados
              </span>
            </div>
          </div>
        </div>

        {contenidosConDocumentos.length === 0 && curso.secciones.length === 0 ? (
          <EmptyState icon={Inbox} message="Este curso todavía no tiene contenido publicado." />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            {/* COLUMNA PRINCIPAL DE LECCIONES Y SECCIONES */}
            <section className="order-2 space-y-8 lg:order-1">
              <div>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  Ruta de Aprendizaje y Módulos
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Explora las lecciones organizadas por semanas y confirma cada tema al finalizarlo.
                </p>
              </div>

              {/* SECCIONES PLEGABLES */}
              {gruposDeSeccion.map(({ seccion, contenidos }) => {
                const vistosEnSeccion = contenidos.filter((c) => idsVistos.has(c.id)).length;

                return (
                  <details
                    key={seccion.id}
                    open={seccion.esActual || seccion.estado === "DISPONIBLE"}
                    className="group/seccion overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs transition-all space-y-6"
                  >
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 text-lg font-bold select-none min-h-11 list-none [&::-webkit-details-marker]:hidden">
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

                      {seccion.estado !== "NO_DISPONIBLE" && contenidos.length > 0 && (
                        <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          {vistosEnSeccion} de {contenidos.length} temas
                        </span>
                      )}
                    </summary>

                    {seccion.estado === "NO_DISPONIBLE" ? (
                      <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground">
                        Esta sección todavía no está disponible — tu docente la habilitará según el
                        avance de la clase.
                      </div>
                    ) : contenidos.length === 0 ? (
                      <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground">
                        Esta sección todavía no tiene contenidos publicados.
                      </div>
                    ) : (
                      <ul className="space-y-10 pt-2">
                        {contenidos.map((contenido, index) => (
                          <CourseContentItem
                            key={contenido.id}
                            numero={numeroPorContenido.get(contenido.id) ?? index + 1}
                            index={index}
                            titulo={contenido.titulo}
                            descripcion={contenido.descripcion}
                            tipo={contenido.tipo}
                            contentId={contenido.id}
                            visto={idsVistos.has(contenido.id)}
                          >
                            {contenido.tipo === "VIDEO" && (
                              <YoutubeEmbed url={contenido.contenido} titulo={contenido.titulo} />
                            )}
                            {contenido.tipo === "TEXTO" && (
                              <MarkdownContent contenido={contenido.contenido} />
                            )}
                            {contenido.tipo === "DOCUMENTO" && (
                              <DocumentContentList documentos={contenido.documentosConUrl} />
                            )}
                          </CourseContentItem>
                        ))}
                      </ul>
                    )}
                  </details>
                );
              })}

              {/* CONTENIDO SUELTO (SIN SECCIÓN) */}
              {contenidoSueltoEstudiante.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="size-4" />
                    </span>
                    <h3 className="font-heading text-xl font-bold text-foreground">
                      Contenidos Generales del Curso
                    </h3>
                  </div>

                  <ul className="space-y-10">
                    {contenidoSueltoEstudiante.map((contenido, index) => (
                      <CourseContentItem
                        key={contenido.id}
                        numero={numeroPorContenido.get(contenido.id) ?? index + 1}
                        index={index}
                        titulo={contenido.titulo}
                        descripcion={contenido.descripcion}
                        tipo={contenido.tipo}
                        contentId={contenido.id}
                        visto={idsVistos.has(contenido.id)}
                      >
                        {contenido.tipo === "VIDEO" && (
                          <YoutubeEmbed url={contenido.contenido} titulo={contenido.titulo} />
                        )}
                        {contenido.tipo === "TEXTO" && (
                          <MarkdownContent contenido={contenido.contenido} />
                        )}
                        {contenido.tipo === "DOCUMENTO" && (
                          <DocumentContentList documentos={contenido.documentosConUrl} />
                        )}
                      </CourseContentItem>
                    ))}
                  </ul>
                </div>
              )}

              {/* ACTIVIDADES EVALUABLES (19/11/2026) */}
              <div className="space-y-4 pt-4 border-t border-border/60">
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
                              variant={
                                calificada ? "success" : entrega ? "secondary" : "warning"
                              }
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
                              <p className="font-semibold text-success">
                                Comentario de tu profesor
                              </p>
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
              </div>

              {/* EVALUACIONES AUTOMÁTICAS (19/11/2026) */}
              {curso.quizzes.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <ListChecks className="size-5 text-primary" aria-hidden="true" />
                    <h2 className="font-heading text-xl font-bold text-foreground">
                      Evaluaciones
                    </h2>
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
                              <p className="font-heading text-base font-bold text-foreground group-hover:text-primary transition-colors">
                                {quiz.titulo}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {quiz._count.preguntas}{" "}
                                {quiz._count.preguntas === 1 ? "pregunta" : "preguntas"} · se
                                califica al instante
                              </p>
                            </div>

                            <Badge
                              variant={
                                mejor ? (mejor.puntaje >= 60 ? "success" : "warning") : "secondary"
                              }
                              className="font-semibold"
                            >
                              {mejor ? `Tu mejor: ${mejor.puntaje}%` : "Sin responder"}
                            </Badge>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>

            {/* BARRA LATERAL (OUTLINE Y PROGRESO) */}
            <aside className="order-1 lg:sticky lg:top-6 lg:order-2">
              <CourseContentOutline
                tituloCurso={curso.titulo}
                progreso={progreso}
                vistos={idsVistos.size}
                total={contenidosVisibles.length}
                items={contenidosConDocumentos.map((contenido, index) => ({
                  id: contenido.id,
                  numero: index + 1,
                  titulo: contenido.titulo,
                  tipo: contenido.tipo,
                  visto: idsVistos.has(contenido.id),
                }))}
              />
            </aside>
          </div>
        )}
      </main>
    </AppShell>
  );
}
