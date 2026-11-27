import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, ListChecks, Award, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { porcentajeDeNota, promediarPorcentajes, notaSobreCinco } from "@/lib/grades";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type Calificacion = {
  id: string;
  clase: "ACTIVIDAD" | "QUIZ";
  titulo: string;
  detalle: string;
  porcentaje: number;
  retroalimentacion: string | null;
};

/**
 * US46 — "Mis notas": el consolidado de calificaciones del Estudiante.
 *
 * Hasta hoy las notas existían pero estaban desparramadas: la de una
 * actividad solo se veía dentro de esa actividad, y la de un quiz dentro de
 * ese quiz. El Tutor tenía su panel de seguimiento desde el 19/11; el
 * estudiante no tenía nada equivalente y no podía responder la pregunta más
 * simple de todas: "¿cómo voy?".
 *
 * Dos cosas que no se mezclan por descuido:
 * - Una actividad trae su nota sobre el puntaje máximo que definió el Tutor;
 *   un quiz trae un porcentaje. Se normaliza todo a porcentaje en
 *   `lib/grades.ts` antes de promediar.
 * - De cada quiz se toma el MEJOR intento, el mismo criterio que ya usa la
 *   página del curso: en un quiz repetir es parte del aprendizaje.
 */
export default async function NotasEstudiantePage() {
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

  const [entregas, intentos, inscripciones] = await Promise.all([
    // Solo las ya calificadas: una entrega sin nota todavía no es una nota.
    prisma.entregas.findMany({
      where: { userId: usuarioActual.id, nota: { not: null } },
      orderBy: { calificadaEn: "desc" },
      include: {
        actividad: {
          select: {
            id: true,
            titulo: true,
            puntajeMaximo: true,
            courseId: true,
          },
        },
      },
    }),
    prisma.intentosQuiz.findMany({
      where: { userId: usuarioActual.id },
      orderBy: { puntaje: "desc" },
      include: { quiz: { select: { id: true, titulo: true, courseId: true } } },
    }),
    prisma.courseUsers.findMany({
      where: { userId: usuarioActual.id },
      include: { course: { select: { id: true, titulo: true } } },
      orderBy: { fecha: "desc" },
    }),
  ]);

  // Mejor intento por quiz. Los intentos vienen ordenados de mayor a menor
  // puntaje, así que el primero de cada quiz es el mejor.
  const mejorPorQuiz = new Map<string, (typeof intentos)[number]>();
  for (const intento of intentos) {
    if (!mejorPorQuiz.has(intento.quizId)) {
      mejorPorQuiz.set(intento.quizId, intento);
    }
  }

  const calificacionesPorCurso = new Map<string, Calificacion[]>();

  function agregar(courseId: string, calificacion: Calificacion) {
    const actuales = calificacionesPorCurso.get(courseId) ?? [];
    actuales.push(calificacion);
    calificacionesPorCurso.set(courseId, actuales);
  }

  for (const entrega of entregas) {
    const porcentaje = porcentajeDeNota(entrega.nota ?? 0, entrega.actividad.puntajeMaximo);

    agregar(entrega.actividad.courseId, {
      id: entrega.id,
      clase: "ACTIVIDAD",
      titulo: entrega.actividad.titulo,
      detalle: `${entrega.nota} de ${entrega.actividad.puntajeMaximo} puntos`,
      porcentaje,
      retroalimentacion: entrega.retroalimentacion,
    });
  }

  for (const intento of mejorPorQuiz.values()) {
    agregar(intento.quiz.courseId, {
      id: intento.id,
      clase: "QUIZ",
      titulo: intento.quiz.titulo,
      detalle: `${intento.correctas} de ${intento.total} preguntas correctas`,
      porcentaje: Math.round(intento.puntaje),
      retroalimentacion: null,
    });
  }

  const cursosConNotas = inscripciones
    .map((inscripcion) => {
      const calificaciones = calificacionesPorCurso.get(inscripcion.course.id) ?? [];

      return {
        courseId: inscripcion.course.id,
        titulo: inscripcion.course.titulo,
        calificaciones,
        promedio: promediarPorcentajes(calificaciones.map((c) => c.porcentaje)),
      };
    })
    .filter((curso) => curso.calificaciones.length > 0);

  const todosLosPorcentajes = cursosConNotas.flatMap((curso) =>
    curso.calificaciones.map((c) => c.porcentaje)
  );
  const promedioGeneral = promediarPorcentajes(todosLosPorcentajes);

  return (
    <AppShell usuario={usuarioActual} breadcrumbs={[{ label: "Mis notas" }]}>
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <PageHeader
          titulo="Mis Notas"
          descripcion="Todo lo que te han calificado, curso por curso: actividades entregadas y evaluaciones."
          icono={Award}
          insignia={
            promedioGeneral === null
              ? "Sin notas todavía"
              : `Promedio ${notaSobreCinco(promedioGeneral)} / 5.0`
          }
        />

        {promedioGeneral !== null && (
          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border bg-card p-6">
            <div
              className="flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs"
              aria-hidden="true"
            >
              <span className="font-heading text-2xl font-extrabold leading-none">
                {notaSobreCinco(promedioGeneral)}
              </span>
              <span className="text-[10px] font-bold uppercase opacity-90">de 5.0</span>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-heading text-lg font-bold text-foreground">
                Promedio general: {promedioGeneral}%
              </p>
              <Progress
                value={promedioGeneral}
                variant={promedioGeneral >= 60 ? "success" : "warning"}
                size="lg"
                aria-label="Promedio general"
              />
              <p className="text-xs text-muted-foreground">
                Sobre {todosLosPorcentajes.length}{" "}
                {todosLosPorcentajes.length === 1 ? "calificación" : "calificaciones"} en{" "}
                {cursosConNotas.length} {cursosConNotas.length === 1 ? "curso" : "cursos"}.
              </p>
            </div>
          </div>
        )}

        {cursosConNotas.length === 0 ? (
          <EmptyState
            icon={Award}
            message="Todavía no tienes calificaciones. Entrega una actividad o responde una evaluación y aparecerán acá."
          />
        ) : (
          <div className="space-y-6">
            {cursosConNotas.map((curso) => (
              <section
                key={curso.courseId}
                className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <BookOpen className="size-4" aria-hidden="true" />
                    </span>
                    <Link
                      href={`/estudiante/cursos/${curso.courseId}`}
                      className="font-heading text-lg font-bold text-foreground transition-colors hover:text-primary"
                    >
                      {curso.titulo}
                    </Link>
                  </div>

                  {curso.promedio !== null && (
                    <Badge
                      variant={curso.promedio >= 60 ? "success" : "warning"}
                      className="font-semibold"
                    >
                      {notaSobreCinco(curso.promedio)} / 5.0 · {curso.promedio}%
                    </Badge>
                  )}
                </div>

                <ul className="space-y-3">
                  {curso.calificaciones.map((calificacion) => (
                    <li
                      key={calificacion.id}
                      className="space-y-2 rounded-2xl border border-border/70 bg-background p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <p className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                            {calificacion.clase === "ACTIVIDAD" ? (
                              <ClipboardList className="size-3.5 text-muted-foreground" aria-hidden="true" />
                            ) : (
                              <ListChecks className="size-3.5 text-muted-foreground" aria-hidden="true" />
                            )}
                            {calificacion.clase === "ACTIVIDAD" ? "Actividad" : "Evaluación"}
                          </p>
                          <p className="font-heading text-base font-bold text-foreground">
                            {calificacion.titulo}
                          </p>
                          <p className="text-xs text-muted-foreground">{calificacion.detalle}</p>
                        </div>

                        <Badge
                          variant={calificacion.porcentaje >= 60 ? "success" : "warning"}
                          className="font-semibold"
                        >
                          {notaSobreCinco(calificacion.porcentaje)}
                        </Badge>
                      </div>

                      {calificacion.retroalimentacion && (
                        <div className="rounded-2xl border border-success-border bg-success-soft px-3 py-2 text-sm">
                          <p className="font-semibold text-success">Comentario de tu profesor</p>
                          <p className="whitespace-pre-wrap text-foreground">
                            {calificacion.retroalimentacion}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
