import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Inbox,
  Sparkles,
  BookOpen,
  Calendar,
  ClipboardList,
  Layers,
  Plus,
  Settings2,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AssignStudentsForm } from "@/components/assign-students-form";
import { UnenrollStudentsForm } from "@/components/unenroll-students-form";
import { CreateVideoContentForm } from "@/components/create-video-content-form";
import { UploadDocumentForm } from "@/components/upload-document-form";
import { CreateTextContentForm } from "@/components/create-text-content-form";
import { CreateLinkContentForm } from "@/components/create-link-content-form";
import { CreateCodeContentForm } from "@/components/create-code-content-form";
import { ContentBody } from "@/components/content-body";
import { CreateActivityForm } from "@/components/create-activity-form";
import { CreateQuizForm } from "@/components/create-quiz-form";
import { DeleteEvaluacionForm } from "@/components/delete-evaluacion-form";
import { ContentOrderControls } from "@/components/content-order-controls";
import { SectionControls } from "@/components/section-controls";
import { CreateSectionForm } from "@/components/create-section-form";
import { RenameSectionForm } from "@/components/rename-section-form";
import { SectionAssignSelect } from "@/components/section-assign-select";
import { CourseStatusSelect } from "@/components/course-status-select";
import { EditContentForm } from "@/components/edit-content-form";
import { crearUrlDescarga } from "@/lib/supabase/storage";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { agruparContenidoPorSeccion, contenidoSinSeccion } from "@/lib/group-content-by-section";

export default async function CursoDetallePage({
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

  if (!usuarioActual || usuarioActual.rol !== "TUTOR") {
    redirect("/login");
  }

  const curso = await prisma.courses.findUnique({
    where: { id: courseId },
    include: {
      inscritos: {
        include: { user: true },
      },
      contenidos: {
        orderBy: { orden: "asc" },
        include: { documentos: true },
      },
      secciones: {
        orderBy: { orden: "asc" },
      },
      actividades: {
        orderBy: { orden: "asc" },
        include: {
          // Cuántas entregas lleva cada actividad, para mostrar el avance
          // sin traerse todas las entregas a esta pantalla.
          _count: { select: { entregas: true } },
        },
      },
      quizzes: {
        orderBy: { orden: "asc" },
        include: {
          _count: { select: { preguntas: true, intentos: true } },
        },
      },
    },
  });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    notFound();
  }

  const idsInscritos = curso.inscritos.map((inscripcion) => inscripcion.userId);

  // Corrección del 16/09/2026: la revisión de seguridad de esta misma
  // mañana había agregado aquí el filtro de espacio de US24
  // (`filtroUsuarioVisibleEnEspacio`), pensando que era la misma fuga que
  // ya se corrigió en `/tutor/estudiantes`. Era un error: ese filtro exige
  // que el estudiante ya tenga una inscripción previa para considerarlo
  // "visible", así que ningún estudiante recién creado (por US06 o por la
  // carga masiva de US29) podía asignarse nunca a ningún curso, en ningún
  // espacio — la función quedó inservible. Además, el diseño ya
  // documentado de esta épica (`Backlog.md`, US26) dice explícitamente que
  // un estudiante creado en un espacio **debe poder** ser asignado después
  // por un Tutor de otro espacio distinto, sin duplicar su cuenta — un
  // Estudiante es una cuenta global compartida, a propósito, y este
  // selector es un buscador de ese universo global de estudiantes para
  // inscribir, no un listado de "mis estudiantes" (eso sí sigue filtrado
  // por espacio en `/tutor/estudiantes`, correctamente). Se revierte al
  // comportamiento original: cualquier estudiante del sistema que todavía
  // no esté inscrito en este curso puntual.
  // 17/09/2026, pedido por el docente: un estudiante con matrícula
  // cancelada (desactivado por un Administrador, US20) no debe seguir
  // apareciendo como candidato para asignar a un curso nuevo — solo se
  // excluye de este selector, su historial y su inscripción en cursos
  // donde ya estaba no se tocan.
  const estudiantesDisponibles = await prisma.users.findMany({
    where: {
      rol: "ESTUDIANTE",
      estado: "ACTIVO",
      id: idsInscritos.length > 0 ? { notIn: idsInscritos } : undefined,
    },
    orderBy: { nombre: "asc" },
  });

  // URLs firmadas para descarga de documentos
  const contenidosConDocumentos = await Promise.all(
    curso.contenidos.map(async (contenido) => {
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

  const gruposDeSeccion = agruparContenidoPorSeccion(contenidosConDocumentos, [...curso.secciones]);
  const contenidoSueltoTutor = contenidoSinSeccion(contenidosConDocumentos);
  const opcionesDeSeccion = curso.secciones.map((seccion) => ({
    id: seccion.id,
    titulo: seccion.titulo,
  }));

  return (
    <AppShell
      usuario={usuarioActual}
      breadcrumbs={[{ label: "Mis cursos", href: "/tutor/cursos" }, { label: curso.titulo }]}
    >
      <main className="mx-auto max-w-5xl space-y-10 px-4 sm:px-6 py-8">
        {/* CABECERA DEL CURSO */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold">
                <Sparkles className="size-3 mr-1 text-primary" />
                Gestión de Asignatura
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">Estado del curso:</span>
              <CourseStatusSelect courseId={curso.id} estadoActual={curso.estado} />
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

          {/* Métricas rápidas del curso */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/60 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <GraduationCap className="size-4 text-primary" />
              {curso.inscritos.length}{" "}
              {curso.inscritos.length === 1 ? "estudiante inscrito" : "estudiantes inscritos"}
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="size-4 text-muted-foreground" />
              {curso.secciones.length}{" "}
              {curso.secciones.length === 1 ? "sección / módulo" : "secciones / módulos"}
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-4 text-muted-foreground" />
              {curso.contenidos.length}{" "}
              {curso.contenidos.length === 1 ? "lección publicada" : "lecciones publicadas"}
            </span>
          </div>

          {/* OP08 (21/11/2026): accesos directos a lo que no se ve desde arriba.
              El docente probó la pantalla y reportó que "el tutor no tiene manera
              de ingresar e inscribir estudiantes de forma manual" — sí la tiene,
              pero vive al final de la página, debajo del contenido, de los
              formularios de publicación, de las actividades y de las
              evaluaciones: en un curso con material hay que bajar mucho para
              llegar, así que en la práctica no existe. */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href="#estudiantes"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11 gap-2")}
            >
              <UserPlus className="size-4" aria-hidden="true" />
              Inscribir estudiantes
            </a>
            <Link
              href={`/tutor/cursos/${curso.id}/seguimiento`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11 gap-2")}
            >
              <TrendingUp className="size-4" aria-hidden="true" />
              Seguimiento
            </Link>
            <a
              href="#publicar"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11 gap-2")}
            >
              <Plus className="size-4" aria-hidden="true" />
              Publicar material
            </a>
          </div>
        </div>

        {/* ÁREA 1: CONTENIDO Y MÓDULOS DE LA RUTA */}
        <section className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Módulos y Lecciones de la Ruta
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Organiza las lecciones en semanas o bloques temáticos. Puedes reordenar y editar
                cada recurso.
              </p>
            </div>
            <CreateSectionForm courseId={curso.id} />
          </div>

          {contenidosConDocumentos.length === 0 && curso.secciones.length === 0 ? (
            <EmptyState icon={Inbox} message="Este curso todavía no tiene contenido publicado." />
          ) : (
            <div className="space-y-6">
              {/* Secciones agrupadas */}
              {gruposDeSeccion.map(({ seccion, contenidos }, indiceSeccion) => (
                <details
                  key={seccion.id}
                  open
                  className="group/seccion space-y-5 rounded-3xl border border-border/80 bg-card p-6 shadow-xs"
                >
                  <summary className="cursor-pointer flex flex-wrap items-center justify-between gap-3 text-lg font-bold select-none min-h-11 list-none [&::-webkit-details-marker]:hidden">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Calendar className="size-4" />
                      </span>
                      <span className="font-heading text-xl font-bold text-foreground">
                        {seccion.titulo}
                      </span>
                      {seccion.esActual && <Badge variant="success">Semana actual</Badge>}
                      {seccion.estado === "NO_DISPONIBLE" && (
                        <Badge variant="secondary">(No disponible para alumnos)</Badge>
                      )}
                    </div>

                    <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {contenidos.length} {contenidos.length === 1 ? "tema" : "temas"}
                    </span>
                  </summary>

                  {/* Controles de edición de la sección, plegados: en el
                      estado normal el tutor viene a mirar el contenido, no a
                      renombrar ni reordenar, y tenerlos siempre abiertos
                      hacía que cada sección pareciera un formulario. */}
                  <details className="group/opciones">
                    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
                      <Settings2 className="size-3.5" aria-hidden="true" />
                      Opciones de la sección
                    </summary>

                    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <RenameSectionForm seccionId={seccion.id} tituloActual={seccion.titulo} />

                      <SectionControls
                        seccionId={seccion.id}
                        esPrimera={indiceSeccion === 0}
                        esUltima={indiceSeccion === gruposDeSeccion.length - 1}
                        estado={seccion.estado}
                        esActual={seccion.esActual}
                      />
                    </div>
                  </details>

                  {contenidos.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic p-2">
                      Esta sección todavía no tiene contenido asignado. Usa los formularios de abajo
                      para publicar lecciones y vincúlalas a esta sección.
                    </p>
                  ) : (
                    <ul className="space-y-4 pt-2">
                      {contenidos.map((contenido, indice) => (
                        <li
                          key={contenido.id}
                          className={`space-y-3 rounded-2xl border border-border/70 bg-background p-5 shadow-xs transition-opacity ${
                            !contenido.visible ? "opacity-60" : ""
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                            <h3 className="font-heading text-lg font-bold text-foreground">
                              {contenido.titulo}
                            </h3>
                            <Badge variant="outline" className="text-xs font-mono">
                              {contenido.tipo}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <ContentOrderControls
                              contentId={contenido.id}
                              esPrimero={indice === 0}
                              esUltimo={indice === contenidos.length - 1}
                              visible={contenido.visible}
                            />
                            <SectionAssignSelect
                              contentId={contenido.id}
                              seccionIdActual={contenido.seccionId}
                              secciones={opcionesDeSeccion}
                            />
                          </div>

                          <EditContentForm
                            contentId={contenido.id}
                            tipo={contenido.tipo}
                            tituloActual={contenido.titulo}
                            descripcionActual={contenido.descripcion}
                            contenidoActual={contenido.contenido}
                            nombreArchivoActual={contenido.documentosConUrl[0]?.nombre}
                          />

                          {contenido.descripcion && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {contenido.descripcion}
                            </p>
                          )}

                          {/* US45: el cuerpo de cada tipo vive en un solo
                              componente (`ContentBody`) — antes este switch
                              estaba repetido cuatro veces entre las páginas
                              del Tutor y del Estudiante. */}
                          <ContentBody
                            tipo={contenido.tipo}
                            titulo={contenido.titulo}
                            contenido={contenido.contenido}
                            documentos={contenido.documentosConUrl}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              ))}

              {/* Contenido sin sección asignada */}
              {(contenidoSueltoTutor.length > 0 || curso.secciones.length === 0) && (
                <div className="space-y-4 rounded-3xl border border-border/80 bg-card p-6 shadow-xs">
                  {curso.secciones.length > 0 && (
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      Lecciones sin sección asignada
                    </h3>
                  )}

                  {contenidoSueltoTutor.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Todo el contenido de este curso ya está organizado en una sección.
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {contenidoSueltoTutor.map((contenido, indice) => (
                        <li
                          key={contenido.id}
                          className={`space-y-3 rounded-2xl border border-border/70 bg-background p-5 shadow-xs transition-opacity ${
                            !contenido.visible ? "opacity-60" : ""
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                            <h3 className="font-heading text-lg font-bold text-foreground">
                              {contenido.titulo}
                            </h3>
                            <Badge variant="outline" className="text-xs font-mono">
                              {contenido.tipo}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <ContentOrderControls
                              contentId={contenido.id}
                              esPrimero={indice === 0}
                              esUltimo={indice === contenidoSueltoTutor.length - 1}
                              visible={contenido.visible}
                            />
                            <SectionAssignSelect
                              contentId={contenido.id}
                              seccionIdActual={contenido.seccionId}
                              secciones={opcionesDeSeccion}
                            />
                          </div>

                          <EditContentForm
                            contentId={contenido.id}
                            tipo={contenido.tipo}
                            tituloActual={contenido.titulo}
                            descripcionActual={contenido.descripcion}
                            contenidoActual={contenido.contenido}
                            nombreArchivoActual={contenido.documentosConUrl[0]?.nombre}
                          />

                          {contenido.descripcion && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {contenido.descripcion}
                            </p>
                          )}

                          {/* US45: el cuerpo de cada tipo vive en un solo
                              componente (`ContentBody`) — antes este switch
                              estaba repetido cuatro veces entre las páginas
                              del Tutor y del Estudiante. */}
                          <ContentBody
                            tipo={contenido.tipo}
                            titulo={contenido.titulo}
                            contenido={contenido.contenido}
                            documentos={contenido.documentosConUrl}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

        </section>

        {/* ÁREA 2: PUBLICACIÓN DE NUEVO MATERIAL */}
        <section id="publicar" className="scroll-mt-6 space-y-4 pt-4 border-t border-border/60">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">
              Publicar Nuevo Material en el Curso
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Elige el tipo de material y completa el formulario que se abre.
            </p>
          </div>

          {/* Cada botón abre su formulario en una ventana (rediseño de
              2026-11). Antes los tres estaban abiertos a la vez en tres
              columnas: la página arrancaba con una pared de campos vacíos en
              lugar del contenido del curso, y el ancho de cada columna
              apretaba el área de redacción y el selector de archivo. */}
          <div className="flex flex-wrap gap-3">
            <CreateVideoContentForm courseId={curso.id} />
            <UploadDocumentForm courseId={curso.id} />
            <CreateTextContentForm courseId={curso.id} />
            {/* US45 (20/11/2026): dos tipos más, para que un curso no sea
                siempre la misma mezcla de video, texto y PDF. */}
            <CreateLinkContentForm courseId={curso.id} />
            <CreateCodeContentForm courseId={curso.id} />
          </div>
        </section>

        {/* ÁREA 2B: ACTIVIDADES EVALUABLES (19/11/2026) */}
        <section className="space-y-4 pt-4 border-t border-border/60">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Actividades y Calificaciones
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Lo que tus estudiantes deben presentar. Entra a una actividad para ver las entregas
                y poner notas.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/tutor/cursos/${curso.id}/seguimiento`}
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <TrendingUp className="size-4 text-primary" aria-hidden="true" />
                Ver seguimiento
              </Link>
              <CreateQuizForm courseId={curso.id} secciones={curso.secciones} />
              <CreateActivityForm courseId={curso.id} secciones={curso.secciones} />
            </div>
          </div>

          {curso.actividades.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              message="Aún no has creado actividades para este curso."
            />
          ) : (
            <ul className="space-y-3">
              {/* OP08 (21/11/2026): la fila dejó de ser un único <Link> que
                  envolvía todo. El botón de eliminar es un formulario, y un
                  formulario dentro de un enlace no es HTML válido: cualquier
                  clic dentro habría navegado al detalle de la actividad. Ahora
                  el enlace es solo el título. */}
              {curso.actividades.map((actividad) => (
                <li
                  key={actividad.id}
                  className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <Link
                        href={`/tutor/cursos/${curso.id}/actividades/${actividad.id}`}
                        className="font-heading text-base font-bold text-foreground transition-colors hover:text-primary"
                      >
                        {actividad.titulo}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {actividad.puntajeMaximo} puntos
                        {actividad.fechaLimite
                          ? ` · hasta el ${actividad.fechaLimite.toLocaleDateString("es-CO")}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Badge
                        variant={actividad._count.entregas > 0 ? "success" : "secondary"}
                        className="font-semibold"
                      >
                        {actividad._count.entregas} de {curso.inscritos.length} entregaron
                      </Badge>

                      <DeleteEvaluacionForm
                        tipo="actividad"
                        id={actividad.id}
                        titulo={actividad.titulo}
                        trabajoAsociado={actividad._count.entregas}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {curso.quizzes.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="font-heading text-base font-bold text-foreground">
                Evaluaciones automáticas
              </h3>
              <ul className="space-y-3">
                {curso.quizzes.map((quiz) => (
                  <li
                    key={quiz.id}
                    className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 transition-colors hover:border-primary/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <Link
                          href={`/tutor/cursos/${curso.id}/quizzes/${quiz.id}`}
                          className="font-heading text-base font-bold text-foreground transition-colors hover:text-primary"
                        >
                          {quiz.titulo}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {quiz._count.preguntas}{" "}
                          {quiz._count.preguntas === 1 ? "pregunta" : "preguntas"} ·{" "}
                          {quiz._count.intentos}{" "}
                          {quiz._count.intentos === 1 ? "intento" : "intentos"}
                          {quiz.intentosMaximos
                            ? ` · máximo ${quiz.intentosMaximos} por estudiante`
                            : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Badge
                          variant={quiz.visible ? "success" : "secondary"}
                          className="font-semibold"
                        >
                          {quiz.visible ? "Publicada" : "Oculta"}
                        </Badge>

                        <DeleteEvaluacionForm
                          tipo="evaluacion"
                          id={quiz.id}
                          titulo={quiz.titulo}
                          trabajoAsociado={quiz._count.intentos}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ÁREA 3: GESTIÓN DE ESTUDIANTES DEL CURSO */}
        <section id="estudiantes" className="scroll-mt-6 space-y-6 pt-4 border-t border-border/60">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">
              Estudiantes del Curso
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inscribe a nuevos alumnos o administra a los estudiantes ya matriculados en esta
              asignatura.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Asignar nuevos estudiantes */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <UserPlus className="size-5" />
                <h3 className="font-heading text-lg font-bold text-foreground">
                  Inscribir Estudiantes
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Selecciona alumnos de la institución para agregarlos a este curso.
              </p>
              <AssignStudentsForm courseId={curso.id} estudiantes={estudiantesDisponibles} />
            </div>

            {/* Estudiantes inscritos actualmente */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-success">
                <Users className="size-5" />
                <h3 className="font-heading text-lg font-bold text-foreground">
                  Alumnos Matriculados ({curso.inscritos.length})
                </h3>
              </div>

              {curso.inscritos.length === 0 ? (
                <EmptyState
                  icon={GraduationCap}
                  message="Aún no hay estudiantes inscritos en este curso."
                />
              ) : (
                <UnenrollStudentsForm
                  courseId={curso.id}
                  estudiantes={curso.inscritos.map((inscripcion) => ({
                    id: inscripcion.user.id,
                    nombre: inscripcion.user.nombre,
                    apellido: inscripcion.user.apellido,
                    email: inscripcion.user.email,
                  }))}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
