import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  ClipboardList,
  FileQuestion,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdoptCourseForm } from "@/components/adopt-course-form";
import { ModerateCourseControls } from "@/components/moderate-course-controls";
import { ReportCourseDialog } from "@/components/report-course-dialog";
import { cn } from "@/lib/utils";

/**
 * US47 — la ficha de un curso compartido por otro docente (23/11/2026).
 *
 * **Es la única pantalla del proyecto que cruza espacios a propósito**, y
 * por eso es la que hay que mirar con más cuidado. Dos reglas la sostienen:
 *
 * 1. Solo abre cursos con `compartible: true`. Conocer el id de un curso
 *    privado no alcanza para verlo — da 404, como cualquier cosa que no
 *    existe para quien pregunta.
 * 2. Muestra la vitrina, no el curso: título, descripción, portada, autor y
 *    cuánto material trae. **Nunca sus estudiantes, sus entregas ni sus
 *    notas.** El contenido completo se ve después de adoptarlo, en la
 *    propia copia.
 *
 * Mientras no exista el catálogo (US48), se llega por el enlace que el
 * autor comparte desde su curso.
 */
export default async function FichaCursoCompartidoPage({
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

  // US49: el Super Administrador también entra aquí, para poder verificar o
  // retirar un curso del catálogo. No puede adoptarlo — no es docente de
  // ningún espacio — pero sí necesita verlo tal como lo ven los demás.
  const esSuperAdmin = usuarioActual?.rol === "SUPERADMIN";

  if (!usuarioActual || (usuarioActual.rol !== "TUTOR" && !esSuperAdmin)) {
    redirect("/login");
  }

  const curso = await prisma.courses.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      imagen: true,
      tutorId: true,
      compartible: true,
      verificado: true,
      origenAutor: true,
      tutor: { select: { nombre: true, apellido: true } },
      _count: {
        select: { contenidos: true, actividades: true, quizzes: true },
      },
    },
  });

  if (!curso || !curso.compartible) {
    notFound();
  }

  const autor = `${curso.tutor.nombre} ${curso.tutor.apellido}`.trim();
  const esMio = curso.tutorId === usuarioActual.id;

  const yaAdoptado = await prisma.courses.findFirst({
    where: { tutorId: usuarioActual.id, origenCursoId: curso.id },
    select: { id: true },
  });

  return (
    <AppShell
      usuario={usuarioActual}
      breadcrumbs={[
        { label: "Catálogo", href: "/tutor/catalogo" },
        { label: curso.titulo },
      ]}
    >
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <Link
          href="/tutor/catalogo"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "min-h-11 gap-2 font-semibold"
          )}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al catálogo
        </Link>

        <article className="overflow-hidden rounded-3xl border border-border/80 bg-card">
          {curso.imagen && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={curso.imagen}
              alt=""
              className="aspect-video w-full object-cover"
            />
          )}

          <div className="space-y-5 p-6 sm:p-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-semibold">
                  Curso compartido
                </Badge>
                {curso.verificado && (
                  <Badge variant="default" className="gap-1 font-semibold">
                    <BadgeCheck className="size-3.5" aria-hidden="true" />
                    Verificado por la plataforma
                  </Badge>
                )}
              </div>

              <h1 className="font-heading text-3xl font-extrabold tracking-tight text-balance text-foreground">
                {curso.titulo}
              </h1>

              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="size-4" aria-hidden="true" />
                {curso.origenAutor ? (
                  <>
                    Compartido por {autor} · material original de {curso.origenAutor}
                  </>
                ) : (
                  <>Creado por {autor}</>
                )}
              </p>

              <p className="leading-relaxed text-muted-foreground">{curso.descripcion}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Dato icono={BookOpen} etiqueta="Lecciones" valor={curso._count.contenidos} />
              <Dato
                icono={ClipboardList}
                etiqueta="Actividades"
                valor={curso._count.actividades}
              />
              <Dato
                icono={FileQuestion}
                etiqueta="Evaluaciones"
                valor={curso._count.quizzes}
              />
            </div>

            <div className="space-y-4 border-t border-border/60 pt-5">
              {esSuperAdmin && (
                <ModerateCourseControls
                  courseId={curso.id}
                  verificado={curso.verificado}
                  compartible={curso.compartible}
                />
              )}

              {esSuperAdmin ? null : esMio ? (
                <p className="text-sm text-muted-foreground">
                  Este curso es tuyo. Así es como lo ven los demás docentes.
                </p>
              ) : yaAdoptado ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <Link
                    href={`/tutor/cursos/${yaAdoptado.id}`}
                    className={cn(buttonVariants({ variant: "outline" }), "min-h-11 gap-2")}
                  >
                    Ya tienes tu copia — abrirla
                  </Link>
                  <ReportCourseDialog courseId={curso.id} />
                </div>
              ) : (
                <div className="space-y-4">
                  <AdoptCourseForm courseId={curso.id} titulo={curso.titulo} autor={autor} />
                  <div className="flex justify-end">
                    <ReportCourseDialog courseId={curso.id} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>
      </main>
    </AppShell>
  );
}

function Dato({
  icono: Icono,
  etiqueta,
  valor,
}: {
  icono: typeof BookOpen;
  etiqueta: string;
  valor: number;
}) {
  return (
    <div className="space-y-1 rounded-2xl border border-border/60 bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icono className="size-4" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wide">{etiqueta}</span>
      </div>
      <p className="font-heading text-2xl font-bold text-foreground">{valor}</p>
    </div>
  );
}
