import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { TakeQuizForm } from "@/components/take-quiz-form";
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
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Volver al curso
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
          </div>
        </div>

        <TakeQuizForm
          quizId={quiz.id}
          preguntas={quiz.preguntas}
          yaIntentado={intentos.length > 0}
        />
      </main>
    </AppShell>
  );
}
