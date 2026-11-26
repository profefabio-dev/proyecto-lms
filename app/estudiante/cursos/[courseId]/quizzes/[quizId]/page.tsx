import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TakeQuizForm } from "@/components/take-quiz-form";
import { intentosRestantes } from "@/lib/quiz-attempts";
import { Badge } from "@/components/ui/badge";

// Pantalla del Estudiante para responder una evaluación (19/11/2026).
//
// La consulta de opciones selecciona **solo id y texto**: `esCorrecta` no
// puede viajar al navegador, porque quedaría escrito en el HTML de la
// página y bastaría con mirar el código fuente para ver las respuestas.
// La calificación la hace el servidor en `responderQuiz`.
export default async function ResponderQuizPage({
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

  if (!usuarioActual || usuarioActual.rol !== "ESTUDIANTE") {
    redirect("/login");
  }

  const quiz = await prisma.quizzes.findUnique({
    where: { id: quizId },
    include: {
      course: { select: { id: true, titulo: true } },
      preguntas: {
        orderBy: { orden: "asc" },
        select: {
          id: true,
          enunciado: true,
          opciones: {
            orderBy: { orden: "asc" },
            select: { id: true, texto: true },
          },
        },
      },
    },
  });

  if (!quiz || quiz.courseId !== courseId || !quiz.visible) {
    notFound();
  }

  const inscripcion = await prisma.courseUsers.findFirst({
    where: { courseId, userId: usuarioActual.id },
  });

  if (!inscripcion) {
    notFound();
  }

  const intentos = await prisma.intentosQuiz.findMany({
    where: { quizId, userId: usuarioActual.id },
    orderBy: { realizadoEn: "desc" },
  });

  const mejor = intentos.reduce(
    (maximo: number, intento: { puntaje: number }) => Math.max(maximo, intento.puntaje),
    0
  );

  // OP08: cuántos intentos le quedan (ver `lib/quiz-attempts.ts`).
  const restantes = intentosRestantes(quiz.intentosMaximos, intentos.length);

  return (
    <AppShell
      usuario={usuarioActual}
      breadcrumbs={[
        { label: "Mis cursos", href: "/estudiante" },
        { label: quiz.course.titulo, href: `/estudiante/cursos/${courseId}` },
        { label: quiz.titulo },
      ]}
    >
      <main className="mx-auto max-w-3xl space-y-8 px-4 sm:px-6 py-8">
        <div className="space-y-3">
          <Link
            href={`/estudiante/cursos/${courseId}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "min-h-11 gap-2 font-semibold"
            )}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver al curso
          </Link>

          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              {quiz.titulo}
            </h1>
            {quiz.descripcion && (
              <p className="text-sm text-muted-foreground">{quiz.descripcion}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs font-semibold">
              <HelpCircle className="mr-1 size-3 text-primary" aria-hidden="true" />
              {quiz.preguntas.length} {quiz.preguntas.length === 1 ? "pregunta" : "preguntas"}
            </Badge>
            {intentos.length > 0 && (
              <Badge variant={mejor >= 60 ? "success" : "warning"} className="font-semibold">
                Tu mejor resultado: {mejor}%
              </Badge>
            )}
            {/* OP08 (21/11/2026): si el Tutor puso un límite, el estudiante
                tiene que saber cuántos intentos le quedan ANTES de empezar. */}
            {quiz.intentosMaximos !== null && (
              <Badge
                variant={restantes > 0 ? "outline" : "secondary"}
                className="font-semibold"
              >
                {restantes > 0
                  ? `Te ${restantes === 1 ? "queda" : "quedan"} ${restantes} de ${quiz.intentosMaximos} ${quiz.intentosMaximos === 1 ? "intento" : "intentos"}`
                  : `Sin intentos disponibles (${quiz.intentosMaximos} de ${quiz.intentosMaximos} usados)`}
              </Badge>
            )}
          </div>
        </div>

        {/* El bloqueo real está en `responderQuiz`, del lado del servidor;
            esto solo evita mostrarle un formulario que ya no puede enviar. */}
        {restantes === 0 ? (
          <div className="space-y-2 rounded-2xl border border-border/80 bg-muted/30 p-6">
            <p className="font-heading text-base font-bold text-foreground">
              Ya usaste todos tus intentos en esta evaluación.
            </p>
            <p className="text-sm text-muted-foreground">
              Tu mejor resultado fue {mejor}% y es el que queda registrado. Si crees que necesitas
              otra oportunidad, háblalo con tu docente.
            </p>
          </div>
        ) : (
          <TakeQuizForm
            quizId={quiz.id}
            courseId={courseId}
            preguntas={quiz.preguntas}
            yaIntentado={intentos.length > 0}
          />
        )}
      </main>
    </AppShell>
  );
}
