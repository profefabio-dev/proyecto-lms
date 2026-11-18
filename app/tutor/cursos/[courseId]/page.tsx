import { redirect, notFound } from "next/navigation";
import {
  GraduationCap,
  Inbox,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Video,
  FileUp,
  FileText,
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
import { YoutubeEmbed } from "@/components/youtube-embed";
import { MarkdownContent } from "@/components/markdown-content";
import { DocumentContentList } from "@/components/document-content-list";
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
    },
  });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    notFound();
  }

  const idsInscritos = curso.inscritos.map((inscripcion) => inscripcion.userId);

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
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-duo-blue/10 p-6 sm:p-8 shadow-xs space-y-4">
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
              <Layers className="size-4 text-duo-blue" />
              {curso.secciones.length}{" "}
              {curso.secciones.length === 1 ? "sección / módulo" : "secciones / módulos"}
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-4 text-duo-green" />
              {curso.contenidos.length}{" "}
              {curso.contenidos.length === 1 ? "lección publicada" : "lecciones publicadas"}
            </span>
          </div>
        </div>

        {/* ÁREA 1: CONTENIDO Y MÓDULOS DE LA RUTA */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Módulos y Lecciones de la Ruta
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Organiza las lecciones en semanas o bloques temáticos. Puedes reordenar y editar
                cada recurso.
              </p>
            </div>
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

                  {/* Controles de edición de la sección */}
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
                    <RenameSectionForm seccionId={seccion.id} tituloActual={seccion.titulo} />

                    <SectionControls
                      seccionId={seccion.id}
                      esPrimera={indiceSeccion === 0}
                      esUltima={indiceSeccion === gruposDeSeccion.length - 1}
                      estado={seccion.estado}
                      esActual={seccion.esActual}
                    />
                  </div>

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

                          {contenido.tipo === "VIDEO" && (
                            <YoutubeEmbed url={contenido.contenido} titulo={contenido.titulo} />
                          )}
                          {contenido.tipo === "TEXTO" && (
                            <MarkdownContent contenido={contenido.contenido} />
                          )}
                          {contenido.tipo === "DOCUMENTO" && (
                            <DocumentContentList documentos={contenido.documentosConUrl} />
                          )}
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

                          {contenido.tipo === "VIDEO" && (
                            <YoutubeEmbed url={contenido.contenido} titulo={contenido.titulo} />
                          )}
                          {contenido.tipo === "TEXTO" && (
                            <MarkdownContent contenido={contenido.contenido} />
                          )}
                          {contenido.tipo === "DOCUMENTO" && (
                            <DocumentContentList documentos={contenido.documentosConUrl} />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* FORMULARIO PARA CREAR SECCIÓN NUEVA */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Calendar className="size-5" />
              <h3 className="font-heading text-lg font-bold text-foreground">
                Crear Nueva Sección o Módulo Semanal
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Agrega una nueva estación o semana en la ruta de aprendizaje de tu curso.
            </p>
            <CreateSectionForm courseId={curso.id} />
          </div>
        </section>

        {/* ÁREA 2: PUBLICACIÓN DE NUEVO MATERIAL */}
        <section className="space-y-6 pt-4 border-t border-border/60">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">
              Publicar Nuevo Material en el Curso
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecciona el tipo de material didáctico que deseas compartir con tus estudiantes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-duo-blue">
                <Video className="size-5" />
                <h3 className="font-heading text-base font-bold text-foreground">
                  Publicar Video Tutorial
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Inserta enlaces de YouTube para videoclases y explicaciones.
              </p>
              <CreateVideoContentForm courseId={curso.id} />
            </div>

            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-duo-orange">
                <FileUp className="size-5" />
                <h3 className="font-heading text-base font-bold text-foreground">
                  Subir Guía o Documento
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Adjunta talleres y lecturas en PDF, Word u otros formatos.
              </p>
              <UploadDocumentForm courseId={curso.id} />
            </div>

            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-duo-green">
                <FileText className="size-5" />
                <h3 className="font-heading text-base font-bold text-foreground">
                  Publicar Lectura en Texto
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Redacta explicaciones directas con formato Markdown enriquecido.
              </p>
              <CreateTextContentForm courseId={curso.id} />
            </div>
          </div>
        </section>

        {/* ÁREA 3: GESTIÓN DE ESTUDIANTES DEL CURSO */}
        <section className="space-y-6 pt-4 border-t border-border/60">
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
