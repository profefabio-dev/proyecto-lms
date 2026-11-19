import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, HelpCircle, ListChecks, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { AddQuestionForm } from "@/components/add-question-form";
import { ToggleQuizVisibilityForm } from "@/components/toggle-quiz-visibility-form";
import { DataTable, Th, Td } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";

// Pantalla del Tutor para armar una evaluación y ver sus resultados
// (19/11/2026): carga de preguntas arriba, y abajo el mejor resultado de
// cada estudiante que la haya respondido.
export default async function EditarQuizPage({
  params,
}: {
  params: Promise<{ courseId: string; quizId: string }>;
}) {
  const { courseId, quizId } = await params;

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

  const quiz = await prisma.quizzes.findUnique({
    where: { id: quizId },
    include: {
      course: true,
      preguntas: {
        orderBy: { orden: "asc" },
        include: { opciones: { orderBy: { orden: "asc" } } },
      },
      intentos: {
        include: { user: true },
        orderBy: { realizadoEn: "desc" },
      },
    },
  });

  if (!quiz || quiz.courseId !== courseId) {
    notFound();
  }

  if (quiz.course.tutorId !== usuarioActual.id) {
    notFound();
  }

  // Un estudiante puede intentarlo varias veces; en la tabla se muestra su
  // mejor resultado, con el número de intentos al lado.
  const mejorPorEstudiante = new Map<
    string,
    { nombre: string; mejor: number; intentos: number; ultimo: Date }
  >();

  for (const intento of quiz.intentos) {
    const previo = mejorPorEstudiante.get(intento.userId);
    const nombre = `${intento.user.nombre} ${intento.user.apellido}`;

    if (!previo) {
      mejorPorEstudiante.set(intento.userId, {
        nombre,
        mejor: intento.puntaje,
        intentos: 1,
        ultimo: intento.realizadoEn,
      });
    } else {
      previo.intentos += 1;
      previo.mejor = Math.max(previo.mejor, intento.puntaje);
    }
  }

  const resultados = [...mejorPorEstudiante.values()].sort((a, b) => b.mejor - a.mejor);

  const formatoFecha = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <AppShell
      usuario={usuarioActual}
      breadcrumbs={[
        { label: "Mis cursos", href: "/tutor/cursos" },
        { label: quiz.course.titulo, href: `/tutor/cursos/${courseId}` },
        { label: quiz.titulo },
      ]}
    >
      <main className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6 py-8">
        <div className="space-y-3">
          <Link
            href={`/tutor/cursos/${courseId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Volver al curso
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
                {quiz.titulo}
              </h1>
              {quiz.descripcion && (
                <p className="text-sm text-muted-foreground">{quiz.descripcion}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="outline" className="text-xs font-semibold">
                  <HelpCircle className="mr-1 size-3 text-primary" aria-hidden="true" />
                  {quiz.preguntas.length}{" "}
                  {quiz.preguntas.length === 1 ? "pregunta" : "preguntas"}
                </Badge>
                <Badge variant={quiz.visible ? "success" : "secondary"} className="font-semibold">
                  {quiz.visible ? "Publicada" : "Oculta"}
                </Badge>
              </div>
            </div>

            <ToggleQuizVisibilityForm quizId={quiz.id} visible={quiz.visible} />
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground">Preguntas</h2>

          {quiz.preguntas.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              message="Esta evaluación todavía no tiene preguntas. Agrega la primera abajo."
            />
          ) : (
            <ol className="space-y-3">
              {quiz.preguntas.map((pregunta, indice) => (
                <li
                  key={pregunta.id}
                  className="space-y-2 rounded-2xl border border-border/80 bg-card p-5"
                >
                  <p className="font-heading text-base font-bold text-foreground">
                    {indice + 1}. {pregunta.enunciado}
                  </p>
                  <ul className="space-y-1">
                    {pregunta.opciones.map((opcion) => (
                      <li
                        key={opcion.id}
                        className={`flex items-center gap-2 text-sm ${
                          opcion.esCorrecta ? "font-medium text-success" : "text-muted-foreground"
                        }`}
                      >
                        {opcion.esCorrecta ? (
                          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                        ) : (
                          <span className="size-4 shrink-0" aria-hidden="true" />
                        )}
                        {opcion.texto}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground">Agregar una pregunta</h2>
          <AddQuestionForm quizId={quiz.id} />
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground">Resultados</h2>

          {resultados.length === 0 ? (
            <EmptyState icon={Users} message="Todavía nadie ha respondido esta evaluación." />
          ) : (
            <DataTable anchoMinimo="32rem">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40">
                  <Th primera>Estudiante</Th>
                  <Th>Mejor resultado</Th>
                  <Th>Intentos</Th>
                  <Th ultima>Último</Th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((resultado) => (
                  <tr key={resultado.nombre} className="border-b border-border/40 last:border-0">
                    <Td primera>
                      <span className="font-medium text-foreground">{resultado.nombre}</span>
                    </Td>
                    <Td>
                      <Badge
                        variant={resultado.mejor >= 60 ? "success" : "destructive"}
                        className="font-semibold tabular-nums"
                      >
                        {resultado.mejor}%
                      </Badge>
                    </Td>
                    <Td>
                      <span className="tabular-nums text-foreground">{resultado.intentos}</span>
                    </Td>
                    <Td ultima>
                      <span className="text-xs text-muted-foreground">
                        {formatoFecha.format(resultado.ultimo)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </section>
      </main>
    </AppShell>
  );
}
