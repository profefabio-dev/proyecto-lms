import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, List } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ContentBody } from "@/components/content-body";
import { CompleteLessonButton } from "@/components/complete-lesson-button";
import { LessonPlayerShell } from "@/components/lesson-player-shell";
import {
  LessonCurriculum,
  type ModuloDelTemario,
} from "@/components/lesson-curriculum";
import { crearUrlDescarga } from "@/lib/supabase/storage";
import { AppShell } from "@/components/app-shell";
import { calcularProgreso } from "@/lib/course-progress";
import { accesoAlCurso, esVistaPrevia } from "@/lib/course-preview";
import { PreviewBanner } from "@/components/preview-banner";
import {
  filtrarContenidosAccesibles,
  ordenarLecciones,
  ubicarLeccion,
} from "@/lib/course-lessons";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ICONO_POR_TIPO } from "@/lib/content-type-icon";
import { cn } from "@/lib/utils";

/**
 * US43 — reproductor de lecciones: UNA lección a la vez.
 *
 * Es la mitad nueva del rediseño del aula. Antes, la página del curso
 * desplegaba todos los contenidos seguidos; ahora el curso tiene un temario
 * (`../page.tsx`) y cada lección su propia página, con el temario al lado
 * para saltar entre ellas y un botón que marca la lección y avanza.
 *
 * El control de acceso es el mismo de siempre (US11 + US30) y se aplica en
 * este orden: hay sesión, es Estudiante, está inscrito, y la lección está
 * entre las accesibles del curso. Lo último es lo que impide entrar a una
 * lección oculta o de una sección cerrada escribiendo su id en la URL: no
 * se compara contra `visible` a mano, se exige que esté en la secuencia que
 * ve el temario.
 */
export default async function LeccionEstudiantePage({
  params,
}: {
  params: Promise<{ courseId: string; contenidoId: string }>;
}) {
  const { courseId, contenidoId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual) {
    redirect("/login");
  }

  // US42 (25/11/2026): además del estudiante inscrito entra el Tutor dueño
  // del curso, en vista previa de solo lectura. Ver `lib/course-preview.ts`.
  if (usuarioActual.rol !== "ESTUDIANTE" && usuarioActual.rol !== "TUTOR") {
    redirect("/login");
  }

  const curso = await prisma.courses.findUnique({
    where: { id: courseId },
    include: {
      contenidos: { orderBy: { orden: "asc" }, include: { documentos: true } },
      secciones: { orderBy: { orden: "asc" } },
      // US54 (27/11/2026): solo cuántos términos tiene el glosario, para
      // enlazarlo desde el temario lateral mientras se estudia — que es
      // justo cuando hace falta buscar una palabra. La lista no se trae: es
      // otra pantalla.
      _count: { select: { glosario: true } },
    },
  });

  if (!curso) {
    notFound();
  }

  const inscripcion = await prisma.courseUsers.findFirst({
    where: { courseId: curso.id, userId: usuarioActual.id },
  });

  const acceso = accesoAlCurso({
    rol: usuarioActual.rol,
    usuarioId: usuarioActual.id,
    tutorIdDelCurso: curso.tutorId,
    tieneInscripcion: inscripcion !== null,
  });

  if (acceso.modo === "denegado") {
    notFound();
  }

  const vistaPrevia = esVistaPrevia(acceso);

  // Los parámetros de tipo van explícitos a propósito: así la secuencia de
  // lecciones conserva el tipo completo del contenido de Prisma
  // (`contenido`, `documentos`, `tipo`…) en vez de quedarse con el mínimo
  // que exige cada helper.
  type ContenidoDelCurso = (typeof curso.contenidos)[number];
  type SeccionDelCurso = (typeof curso.secciones)[number];

  const accesibles = filtrarContenidosAccesibles<ContenidoDelCurso, SeccionDelCurso>(
    curso.contenidos,
    curso.secciones
  );
  const lecciones = ordenarLecciones<ContenidoDelCurso, SeccionDelCurso>(
    accesibles,
    curso.secciones
  );
  const { indice, actual, anterior, siguiente } = ubicarLeccion<ContenidoDelCurso>(
    lecciones,
    contenidoId
  );

  if (!actual) {
    notFound();
  }

  const vistos =
    lecciones.length === 0
      ? []
      : await prisma.contentViews.findMany({
          where: {
            userId: usuarioActual.id,
            contentId: { in: lecciones.map((leccion) => leccion.id) },
          },
          select: { contentId: true },
        });

  const idsVistos = new Set<string>(vistos.map((visto) => visto.contentId));
  const progreso = calcularProgreso(idsVistos.size, lecciones.length);
  const yaVista = idsVistos.has(actual.id);

  // Las URLs firmadas son de corta duración (US09/US16) y solo se piden
  // para la lección que se está viendo — una ventaja del reproductor sobre
  // la página larga anterior, que firmaba los documentos de todo el curso
  // en cada carga.
  const documentosConUrl =
    actual.tipo === "DOCUMENTO"
      ? await Promise.all(
          actual.documentos.map(async (documento) => ({
            ...documento,
            url: await crearUrlDescarga(documento.archivo),
          }))
        )
      : [];

  const numeroPorContenido = new Map(
    lecciones.map((leccion, posicion) => [leccion.id, posicion + 1])
  );

  const modulos: ModuloDelTemario[] = [
    ...curso.secciones
      .map((seccion) => ({
        titulo: seccion.titulo,
        esActual: seccion.esActual,
        lecciones: lecciones
          .filter((leccion) => leccion.seccionId === seccion.id)
          .map((leccion) => ({
            id: leccion.id,
            numero: numeroPorContenido.get(leccion.id) ?? 0,
            titulo: leccion.titulo,
            tipo: leccion.tipo,
            visto: idsVistos.has(leccion.id),
          })),
      }))
      .filter((modulo) => modulo.lecciones.length > 0),
    ...(lecciones.some((leccion) => leccion.seccionId === null)
      ? [
          {
            titulo: null,
            lecciones: lecciones
              .filter((leccion) => leccion.seccionId === null)
              .map((leccion) => ({
                id: leccion.id,
                numero: numeroPorContenido.get(leccion.id) ?? 0,
                titulo: leccion.titulo,
                tipo: leccion.tipo,
                visto: idsVistos.has(leccion.id),
              })),
          },
        ]
      : []),
  ];

  const { Icon, clase, etiqueta } = ICONO_POR_TIPO[actual.tipo];
  const seccionDeLaLeccion = curso.secciones.find((seccion) => seccion.id === actual.seccionId);

  return (
    <AppShell
      usuario={usuarioActual}
      breadcrumbs={[
        { label: "Mis cursos", href: "/estudiante" },
        { label: curso.titulo, href: `/estudiante/cursos/${curso.id}` },
        { label: actual.titulo },
      ]}
    >
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {vistaPrevia && <PreviewBanner courseId={curso.id} />}

        <LessonPlayerShell
          header={
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Link
                  href={`/estudiante/cursos/${curso.id}`}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "min-h-11 gap-2 text-xs font-semibold"
                  )}
                >
                  <List className="size-4" aria-hidden="true" />
                  Temario
                </Link>
                <span aria-hidden="true">·</span>
                <span>
                  Lección {indice + 1} de {lecciones.length}
                </span>
                {seccionDeLaLeccion && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{seccionDeLaLeccion.titulo}</span>
                  </>
                )}
              </div>

              <header className="space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs sm:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs",
                      clase
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="size-6" />
                  </span>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {etiqueta}
                  </Badge>
                  {yaVista && (
                    <Badge variant="success" className="gap-1 text-xs font-semibold">
                      <Check className="size-3" aria-hidden="true" /> Completada
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <h1 className="font-heading text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-4xl">
                    {actual.titulo}
                  </h1>
                  {actual.descripcion && (
                    <p className="text-base leading-relaxed text-muted-foreground">
                      {actual.descripcion}
                    </p>
                  )}
                </div>
              </header>
            </>
          }
          content={
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs sm:p-8">
              <ContentBody
                tipo={actual.tipo}
                titulo={actual.titulo}
                contenido={actual.contenido}
                documentos={documentosConUrl}
              />
            </div>
          }
          navigation={
            <div className="space-y-3">
              <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                {anterior ? (
                  <Link
                    href={`/estudiante/cursos/${curso.id}/lecciones/${anterior.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "min-h-11 justify-start gap-2 text-left"
                    )}
                  >
                    <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate">{anterior.titulo}</span>
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Esta es la primera lección del curso.
                  </span>
                )}

                <CompleteLessonButton
                  contentId={actual.id}
                  visto={yaVista}
                  esUltima={siguiente === null}
                  vistaPrevia={vistaPrevia}
                />
              </div>

              {siguiente && (
                <p className="px-1 text-xs text-muted-foreground">
                  A continuación: <span className="font-semibold text-foreground">{siguiente.titulo}</span>{" "}
                  <ArrowRight className="inline size-3" aria-hidden="true" />
                </p>
              )}
            </div>
          }
          sidebar={
            <LessonCurriculum
              courseId={curso.id}
              tituloCurso={curso.titulo}
              progreso={progreso}
              vistos={idsVistos.size}
              total={lecciones.length}
              modulos={modulos}
              leccionActualId={actual.id}
              terminosDelGlosario={curso._count.glosario}
            />
          }
          tituloLeccion={actual.titulo}
          numeroLeccion={indice + 1}
          totalLecciones={lecciones.length}
          progreso={progreso}
          yaVista={yaVista}
          esUltima={siguiente === null}
          hrefAnterior={anterior ? `/estudiante/cursos/${curso.id}/lecciones/${anterior.id}` : null}
          tituloAnterior={anterior ? anterior.titulo : null}
          botonCompletar={
            <CompleteLessonButton
              contentId={actual.id}
              visto={yaVista}
              esUltima={siguiente === null}
              vistaPrevia={vistaPrevia}
            />
          }
        />
      </main>
    </AppShell>
  );
}
