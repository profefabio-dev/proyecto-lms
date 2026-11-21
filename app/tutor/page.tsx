import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  FileText,
  ArrowRight,
  Sparkles,
  Layers,
  Users,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function TutorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  // US18: guarda de sesión y rol — antes cualquier persona con sesión activa
  // podía entrar directamente a /tutor sin ser Tutor.
  if (!usuarioActual || usuarioActual.rol !== "TUTOR") {
    redirect("/login");
  }

  const cursosDelTutor = await prisma.courses.findMany({
    where: { tutorId: usuarioActual.id },
    select: { id: true },
  });
  const idsCursos = cursosDelTutor.map((curso) => curso.id);

  const [inscripciones, totalContenidos] = await Promise.all([
    prisma.courseUsers.findMany({
      where: { courseId: { in: idsCursos } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.contents.count({ where: { courseId: { in: idsCursos } } }),
  ]);

  return (
    <AppShell usuario={usuarioActual}>
      <main className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6 py-8">
        {/* BANNER DE BIENVENIDA AL DOCENTE */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="space-y-3 relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider">
                Docente / Tutor
              </Badge>
              <span className="flex items-center gap-1 text-xs text-primary font-medium">
                <Sparkles className="size-3.5" /> Espacio de Gestión Pedagógica
              </span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              ¡Hola, {usuarioActual.nombre}! 👋
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Administra tus asignaturas, organiza tus contenidos en rutas de aprendizaje y realiza
              el seguimiento de los estudiantes en tus cursos.
            </p>
          </div>
        </div>

        {/* INDICADORES CLAVE */}
        <section aria-label="Indicadores generales" className="space-y-3">
          <h2 className="font-heading text-lg font-bold text-foreground">Resumen de Actividad</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="rounded-2xl border border-border/80 shadow-xs">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <BookOpen className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Mis cursos</p>
                  <p className="font-heading text-2xl font-extrabold text-foreground">
                    {cursosDelTutor.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-xs">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
                  <GraduationCap className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Estudiantes inscritos</p>
                  <p className="font-heading text-2xl font-extrabold text-foreground">
                    {inscripciones.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-xs">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FileText className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Contenidos publicados</p>
                  <p className="font-heading text-2xl font-extrabold text-foreground">
                    {totalContenidos}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ACCIONES PRINCIPALES (GESTIÓN RÁPIDA ESTILO CHAMILO) */}
        <section className="space-y-4">
          <h2 className="font-heading text-lg font-bold text-foreground">Herramientas del Docente</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-primary">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                    <Layers className="size-5" />
                  </span>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Gestión de Cursos y Contenidos
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Crea nuevos cursos, organiza tus lecciones por semanas o módulos y publica
                  videoclases, textos explicativos o archivos descargables.
                </p>
              </div>

              <Link
                href="/tutor/cursos"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "min-h-11 justify-between font-semibold"
                )}
              >
                <span>Administrar mis cursos</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 text-success">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-success-soft">
                    <Users className="size-5" />
                  </span>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Gestión de Estudiantes
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Consulta el listado de alumnos asignados, administra inscripciones por grupo y
                  revisa el estado de actividad de tus estudiantes.
                </p>
              </div>

              <Link
                href="/tutor/estudiantes"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "min-h-11 justify-between font-semibold"
                )}
              >
                <span>Ver lista de estudiantes</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* GUÍA DE ORIENTACIÓN PARA EL DOCENTE */}
        <section className="rounded-2xl border border-border/80 bg-muted/20 p-6 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="size-4" />
            <h3 className="font-heading text-sm font-bold text-foreground">
              Recomendaciones para organizar tus Rutas de Aprendizaje
            </h3>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
            <li className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
              <strong className="text-foreground block">1. Estructura por semanas</strong>
              Agrupa tus temas en secciones claras para que los estudiantes sigan un ritmo ordenado.
            </li>
            <li className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
              <strong className="text-foreground block">2. Variedad de formatos</strong>
              Combina explicaciones en video con lecturas y talleres prácticos en PDF o Word.
            </li>
            <li className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
              <strong className="text-foreground block">3. Asignación por grupos</strong>
              Inscribe a tus estudiantes directamente para que encuentren sus cursos al iniciar sesión.
            </li>
          </ul>
        </section>
      </main>
    </AppShell>
  );
}
