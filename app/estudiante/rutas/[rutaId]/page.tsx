import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Lock, Route } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { JoinRutaForm } from "@/components/join-ruta-form";
import {
  filtrarContenidosAccesibles,
  ordenarLecciones,
  siguienteLeccionPendiente,
} from "@/lib/course-lessons";
import { calcularProgreso } from "@/lib/course-progress";
import { calcularAvanceDeRuta, siguienteCursoDeRuta } from "@/lib/route-progress";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * US44 — el recorrido de una ruta, visto por el Estudiante.
 *
 * Los cursos aparecen como pasos numerados, en el orden que definió el
 * Tutor, cada uno con su propio avance; arriba, el avance de la ruta
 * completa y un botón que lleva directo a la lección exacta donde se quedó
 * —aunque esa lección esté tres cursos más adelante—, que es el gesto que
 * convierte una lista de cursos en un camino.
 *
 * Quien todavía no se asoció puede ver el contenido de la ruta (para decidir
 * si le interesa) pero no entrar a los cursos: eso sigue dependiendo de la
 * inscripción, igual que siempre (US11).
 */
export default async function RutaEstudiantePage({
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

  if (!usuarioActual || usuarioActual.rol !== "ESTUDIANTE") {
    redirect("/login");
  }

  const ruta = await prisma.rutas.findUnique({
    where: { id: rutaId },
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
              descripcion: true,
              estado: true,
              contenidos: {
                orderBy: { orden: "asc" },
                select: { id: true, visible: true, seccionId: true },
              },
              secciones: { orderBy: { orden: "asc" }, select: { id: true, estado: true } },
            },
          },
        },
      },
    },
  });

  if (!ruta || ruta.estado !== "PUBLICADA") {
    notFound();
  }

  const asociado = ruta.inscritos.length > 0;

  const vistas = await prisma.contentViews.findMany({
    where: { userId: usuarioActual.id },
    select: { contentId: true },
  });
  const idsVistos = new Set<string>(vistas.map((vista) => vista.contentId));

  const pasos = ruta.cursos.map((fila, posicion) => {
    type ContenidoDelCurso = (typeof fila.course.contenidos)[number];
    type SeccionDelCurso = (typeof fila.course.secciones)[number];

    const lecciones = ordenarLecciones<ContenidoDelCurso, SeccionDelCurso>(
      filtrarContenidosAccesibles<ContenidoDelCurso, SeccionDelCurso>(
        fila.course.contenidos,
        fila.course.secciones
      ),
      fila.course.secciones
    );
    const vistasDelCurso = lecciones.filter((leccion) => idsVistos.has(leccion.id)).length;
    const pendiente = siguienteLeccionPendiente<ContenidoDelCurso>(lecciones, idsVistos);

    return {
      posicion: posicion + 1,
      courseId: fila.course.id,
      titulo: fila.course.titulo,
      descripcion: fila.course.descripcion,
      publicado: fila.course.estado === "PUBLICADO",
      total: lecciones.length,
      vistas: vistasDelCurso,
      progreso: calcularProgreso(vistasDelCurso, lecciones.length),
      // Para el botón "Continuar": la lección exacta donde se quedó en ese
      // curso, no solo el curso.
      hrefLeccion: pendiente
        ? `/estudiante/cursos/${fila.course.id}/lecciones/${pendiente.id}`
        : `/estudiante/cursos/${fila.course.id}`,
    };
  });

  const avance = calcularAvanceDeRuta(pasos);
  const siguientePaso = siguienteCursoDeRuta<(typeof pasos)[number]>(pasos);

  return (
    <AppShell
      usuario={usuarioActual}
      breadcrumbs={[
        { label: "Rutas de aprendizaje", href: "/estudiante/rutas" },
        { label: ruta.titulo },
      ]}
    >
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        {/* CABECERA DE LA RUTA */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <Link
            href="/estudiante/rutas"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "min-h-11 gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowLeft className="size-4" />
            Volver a mis rutas
          </Link>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Route className="size-5" aria-hidden="true" />
              </span>
              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
                {ruta.titulo}
              </h1>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              {ruta.descripcion}
            </p>
            {ruta.tutor && (
              <p className="text-xs text-muted-foreground">
                Docente: {ruta.tutor.nombre} {ruta.tutor.apellido}
              </p>
            )}
          </div>

          {asociado ? (
            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-foreground">
                  {avance.leccionesVistas} de {avance.leccionesTotales} lecciones de la ruta
                </p>
                <Badge
                  variant={avance.progreso === 100 ? "success" : "default"}
                  className="font-semibold"
                >
                  {avance.progreso}% de la ruta
                </Badge>
              </div>

              <Progress
                value={avance.progreso}
                variant={avance.progreso === 100 ? "success" : "default"}
                size="lg"
                aria-label={`Avance de la ruta ${ruta.titulo}`}
              />

              {siguientePaso ? (
                <Link
                  href={siguientePaso.hrefLeccion}
                  className={cn(buttonVariants({ size: "lg" }), "gap-2 font-bold")}
                >
                  Continuar en {siguientePaso.titulo}
                  <ArrowRight className="size-4" />
                </Link>
              ) : (
                <p className="rounded-2xl border border-success-border bg-success-soft px-4 py-3 text-sm font-semibold text-success">
                  ¡Completaste la ruta entera! Puedes volver a cualquier curso para repasar.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 border-t border-border/60 pt-4">
              <p className="text-sm text-muted-foreground">
                Al asociarte quedas inscrito en los {pasos.filter((p) => p.publicado).length}{" "}
                cursos publicados de esta ruta y aparecen en tus cursos.
              </p>
              <JoinRutaForm rutaId={ruta.id} />
            </div>
          )}
        </div>

        {/* LOS PASOS DEL CAMINO (TIMELINE VISUAL ESTILO PLATZI) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold text-foreground">
              El Camino de Aprendizaje
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              {pasos.length} {pasos.length === 1 ? "curso" : "cursos"} en secuencia
            </span>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-border/80">
            {pasos.map((paso) => {
              const completado = paso.total > 0 && paso.vistas >= paso.total;
              const esSiguiente = siguientePaso?.courseId === paso.courseId;

              return (
                <div key={paso.courseId} className="relative group">
                  {/* Nodo de la línea temporal */}
                  <div
                    className={cn(
                      "absolute -left-6 sm:-left-8 top-5 flex size-6 sm:size-7 -translate-x-1/2 items-center justify-center rounded-full text-xs font-bold transition-all shadow-xs z-10",
                      completado
                        ? "bg-emerald-500 text-white ring-4 ring-emerald-500/15"
                        : esSiguiente
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse"
                          : "bg-muted text-muted-foreground border border-border"
                    )}
                  >
                    {completado ? <Check className="size-3.5" /> : paso.posicion}
                  </div>

                  {/* Tarjeta del curso */}
                  <div
                    className={cn(
                      "rounded-2xl border p-5 sm:p-6 transition-all duration-200 bg-card shadow-xs",
                      completado
                        ? "border-emerald-500/30 hover:border-emerald-500/50"
                        : esSiguiente
                          ? "border-primary/50 shadow-md ring-1 ring-primary/20"
                          : "border-border/80 hover:border-border"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            Paso {paso.posicion}
                          </span>
                          {esSiguiente && (
                            <Badge variant="default" className="text-[10px] font-bold uppercase">
                              En Curso
                            </Badge>
                          )}
                          {completado && (
                            <Badge variant="success" className="text-[10px] font-bold">
                              Completado
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-heading text-lg font-bold text-foreground">
                          {paso.titulo}
                        </h3>
                        {paso.descripcion && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {paso.descripcion}
                          </p>
                        )}
                      </div>

                      {!paso.publicado && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Lock className="size-3" /> Aún no disponible
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1 max-w-xs">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-muted-foreground">
                            {paso.total === 0
                              ? "Sin lecciones"
                              : `${paso.vistas} de ${paso.total} lecciones`}
                          </span>
                          <span className={completado ? "text-emerald-500" : "text-primary"}>
                            {paso.progreso}%
                          </span>
                        </div>
                        {paso.total > 0 && (
                          <Progress
                            value={paso.progreso}
                            variant={completado ? "success" : "default"}
                            size="default"
                            aria-label={`Avance de ${paso.titulo}`}
                          />
                        )}
                      </div>

                      {asociado && paso.publicado && (
                        <Link
                          href={paso.hrefLeccion}
                          className={cn(
                            buttonVariants({
                              variant: esSiguiente ? "default" : completado ? "outline" : "secondary",
                              size: "default",
                            }),
                            "gap-2 font-bold rounded-xl shrink-0"
                          )}
                        >
                          {completado ? "Repasar" : paso.vistas > 0 ? "Continuar" : "Empezar"}
                          <ArrowRight className="size-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
