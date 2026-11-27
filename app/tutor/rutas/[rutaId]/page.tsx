import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Users, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import {
  AddCourseToRutaForm,
  RemoveCourseFromRutaForm,
  ToggleRutaEstadoForm,
} from "@/components/ruta-course-forms";
import { filtrarContenidosAccesibles } from "@/lib/course-lessons";
import { calcularAvanceDeRuta } from "@/lib/route-progress";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * US44 — el Tutor arma una ruta y ve quién la está recorriendo.
 *
 * Dos trabajos en una pantalla: ordenar los cursos del camino (agregar,
 * quitar, publicar la ruta) y ver el avance de los estudiantes asociados a
 * lo largo de todo el camino, no curso por curso — que es justo lo que pide
 * la descripción del proyecto ("el docente podrá ver los avances").
 */
export default async function RutaTutorPage({
  params,
}: {
  params: Promise<{ rutaId: string }>;
}) {
  const { rutaId } = await params;

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

  const ruta = await prisma.rutas.findUnique({
    where: { id: rutaId },
    include: {
      cursos: {
        orderBy: { orden: "asc" },
        include: {
          course: {
            include: {
              contenidos: { select: { id: true, visible: true, seccionId: true } },
              secciones: { select: { id: true, estado: true } },
            },
          },
        },
      },
      inscritos: {
        orderBy: { fecha: "asc" },
        include: {
          user: { select: { id: true, nombre: true, apellido: true, grado: true } },
        },
      },
    },
  });

  if (!ruta) {
    notFound();
  }

  // Una ruta solo la gestiona su autor: sin esto, cualquier tutor con sesión
  // podría editar la ruta de otro espacio adivinando el id (mismo criterio
  // que en las páginas de curso del Tutor).
  if (ruta.tutorId !== usuarioActual.id) {
    notFound();
  }

  // Lecciones accesibles de cada curso de la ruta. El criterio es el mismo
  // que ve el estudiante (US30): el contenido oculto o de una sección "No
  // disponible" no entra en el denominador del avance.
  const leccionesPorCurso = ruta.cursos.map((fila) => {
    type ContenidoDelCurso = (typeof fila.course.contenidos)[number];
    type SeccionDelCurso = (typeof fila.course.secciones)[number];

    return {
      courseId: fila.course.id,
      titulo: fila.course.titulo,
      estado: fila.course.estado,
      orden: fila.orden,
      idsLecciones: filtrarContenidosAccesibles<ContenidoDelCurso, SeccionDelCurso>(
        fila.course.contenidos,
        fila.course.secciones
      ).map((contenido) => contenido.id),
    };
  });

  const todasLasLecciones = leccionesPorCurso.flatMap((curso) => curso.idsLecciones);
  const idsEstudiantes = ruta.inscritos.map((inscrito) => inscrito.user.id);

  const vistas =
    todasLasLecciones.length > 0 && idsEstudiantes.length > 0
      ? await prisma.contentViews.findMany({
          where: { userId: { in: idsEstudiantes }, contentId: { in: todasLasLecciones } },
          select: { userId: true, contentId: true },
        })
      : [];

  const vistasPorEstudiante = new Map<string, Set<string>>();
  for (const vista of vistas) {
    const actuales = vistasPorEstudiante.get(vista.userId) ?? new Set<string>();
    actuales.add(vista.contentId);
    vistasPorEstudiante.set(vista.userId, actuales);
  }

  const avancePorEstudiante = ruta.inscritos.map((inscrito) => {
    const suyas = vistasPorEstudiante.get(inscrito.user.id) ?? new Set<string>();

    return {
      estudiante: inscrito.user,
      fecha: inscrito.fecha,
      avance: calcularAvanceDeRuta(
        leccionesPorCurso.map((curso) => ({
          courseId: curso.courseId,
          total: curso.idsLecciones.length,
          vistas: curso.idsLecciones.filter((id) => suyas.has(id)).length,
        }))
      ),
    };
  });

  const totalLecciones = todasLasLecciones.length;
  const idsEnLaRuta = new Set(ruta.cursos.map((fila) => fila.courseId));

  const cursosDisponibles = (
    await prisma.courses.findMany({
      where: { tutorId: usuarioActual.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, titulo: true, estado: true },
    })
  ).filter((curso) => !idsEnLaRuta.has(curso.id));

  return (
    <AppShell
      usuario={usuarioActual}
      breadcrumbs={[
        { label: "Rutas de aprendizaje", href: "/tutor/rutas" },
        { label: ruta.titulo },
      ]}
    >
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        {/* CABECERA */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <Link
            href="/tutor/rutas"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "min-h-11 gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowLeft className="size-4" />
            Volver a mis rutas
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
                  {ruta.titulo}
                </h1>
                <Badge
                  variant={ruta.estado === "PUBLICADA" ? "success" : "warning"}
                  className="font-semibold"
                >
                  {ruta.estado === "PUBLICADA" ? "Publicada" : "Borrador"}
                </Badge>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {ruta.descripcion}
              </p>
            </div>

            <ToggleRutaEstadoForm rutaId={ruta.id} publicada={ruta.estado === "PUBLICADA"} />
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-border/60 pt-3 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-4 text-muted-foreground" />
              {ruta.cursos.length} {ruta.cursos.length === 1 ? "curso" : "cursos"}
            </span>
            <span className="flex items-center gap-1.5">
              <GraduationCap className="size-4 text-primary" />
              {totalLecciones} {totalLecciones === 1 ? "lección" : "lecciones"} en total
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-4 text-muted-foreground" />
              {ruta.inscritos.length}{" "}
              {ruta.inscritos.length === 1 ? "estudiante asociado" : "estudiantes asociados"}
            </span>
          </div>

          {ruta.estado === "BORRADOR" && (
            <p className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
              Mientras esté en borrador, los estudiantes no ven esta ruta. Agrégale los cursos en
              el orden en que quieres que la recorran y luego publícala.
            </p>
          )}
        </div>

        {/* CURSOS DE LA RUTA */}
        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">El camino</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              El estudiante los recorre en este orden. Al agregar un curso publicado, los
              estudiantes que ya venían en la ruta quedan inscritos en él automáticamente.
            </p>
          </div>

          {ruta.cursos.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              message="Esta ruta todavía no tiene cursos. Agrega el primero abajo."
            />
          ) : (
            <ol className="space-y-3">
              {leccionesPorCurso.map((curso, posicion) => (
                <li
                  key={curso.courseId}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/80 bg-card p-5"
                >
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-heading text-base font-extrabold text-primary"
                    aria-hidden="true"
                  >
                    {posicion + 1}
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/tutor/cursos/${curso.courseId}`}
                        className="font-heading text-base font-bold text-foreground transition-colors hover:text-primary"
                      >
                        {curso.titulo}
                      </Link>
                      {curso.estado !== "PUBLICADO" && (
                        <Badge variant="warning" className="font-semibold">
                          {curso.estado === "BORRADOR" ? "Borrador" : "Archivado"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {curso.idsLecciones.length}{" "}
                      {curso.idsLecciones.length === 1
                        ? "lección disponible"
                        : "lecciones disponibles"}
                      {curso.estado !== "PUBLICADO" &&
                        " · al no estar publicado, los estudiantes de la ruta no se inscriben en él"}
                    </p>
                  </div>

                  <RemoveCourseFromRutaForm
                    rutaId={ruta.id}
                    courseId={curso.courseId}
                    tituloCurso={curso.titulo}
                  />
                </li>
              ))}
            </ol>
          )}

          <div className="rounded-2xl border border-border/80 bg-card p-5">
            <AddCourseToRutaForm rutaId={ruta.id} cursosDisponibles={cursosDisponibles} />
          </div>
        </section>

        {/* AVANCE DE LOS ESTUDIANTES */}
        <section className="space-y-4 border-t border-border/60 pt-6">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">
              Quién está recorriendo la ruta
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              El porcentaje pesa por lecciones, no por cursos: terminar un curso de veinte
              lecciones avanza más que terminar uno de dos.
            </p>
          </div>

          {avancePorEstudiante.length === 0 ? (
            <EmptyState
              icon={Users}
              message={
                ruta.estado === "PUBLICADA"
                  ? "Ningún estudiante se ha asociado todavía a esta ruta."
                  : "Publica la ruta para que tus estudiantes puedan asociarse."
              }
            />
          ) : (
            <ul className="space-y-3">
              {avancePorEstudiante.map(({ estudiante, fecha, avance }) => (
                <li
                  key={estudiante.id}
                  className="space-y-3 rounded-2xl border border-border/80 bg-card p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="font-heading text-base font-bold text-foreground">
                        {estudiante.nombre} {estudiante.apellido}
                        {estudiante.grado ? ` · ${estudiante.grado}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Se asoció el {fecha.toLocaleDateString("es-CO")}
                      </p>
                    </div>

                    <Badge
                      variant={
                        avance.progreso === 100
                          ? "success"
                          : avance.progreso > 0
                            ? "default"
                            : "secondary"
                      }
                      className="font-semibold"
                    >
                      {avance.progreso}%
                    </Badge>
                  </div>

                  <Progress
                    value={avance.progreso}
                    variant={avance.progreso === 100 ? "success" : "default"}
                    aria-label={`Avance de ${estudiante.nombre} en la ruta`}
                  />

                  <p className="text-xs text-muted-foreground">
                    {avance.leccionesVistas} de {avance.leccionesTotales} lecciones ·{" "}
                    {avance.cursosCompletados} de {avance.cursosConContenido} cursos completados
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
