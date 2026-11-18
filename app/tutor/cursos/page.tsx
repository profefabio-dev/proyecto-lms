import { redirect } from "next/navigation";
import { BookOpen, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateCourseForm } from "@/components/create-course-form";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function CursosPage() {
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

  const cursos = await prisma.courses.findMany({
    where: { tutorId: usuarioActual.id },
    orderBy: { createdAt: "desc" },
  });

  const VARIANTE_ESTADO_CURSO = {
    PUBLICADO: "success",
    BORRADOR: "warning",
    ARCHIVADO: "secondary",
  } as const;

  // Franja de acento usando los colores del tema
  const ACENTO_ESTADO_CURSO = {
    PUBLICADO: "bg-success",
    BORRADOR: "bg-duo-gold",
    ARCHIVADO: "bg-muted-foreground/40",
  } as const;

  return (
    <AppShell usuario={usuarioActual} breadcrumbs={[{ label: "Mis cursos" }]}>
      <main className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Mis Cursos y Asignaturas
            </h1>
            <p className="text-sm text-muted-foreground">
              Crea nuevos cursos, organiza contenidos por semanas y asigna estudiantes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-semibold text-xs">
              <Sparkles className="size-3 mr-1 text-primary" />
              {cursos.length} {cursos.length === 1 ? "curso registrado" : "cursos registrados"}
            </Badge>
          </div>
        </div>

        {/* FORMULARIO DE CREACIÓN */}
        <CreateCourseForm />

        {/* LISTADO DE CURSOS */}
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground">Cursos Disponibles</h2>

          {cursos.length === 0 ? (
            <EmptyState icon={BookOpen} message="Aún no has creado ningún curso." />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cursos.map((curso) => (
                <Link
                  key={curso.id}
                  href={`/tutor/cursos/${curso.id}`}
                  className="group block outline-none min-h-11 rounded-2xl"
                >
                  <Card className="h-full py-0 border border-border/80 rounded-2xl overflow-hidden shadow-xs transition-all group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-primary/40 group-focus-visible:-translate-y-1 group-focus-visible:shadow-md">
                    {curso.imagen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={curso.imagen}
                        alt=""
                        className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-primary/10 to-duo-blue/10">
                        <BookOpen className="size-10 text-primary/60" aria-hidden="true" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "h-1.5 w-full",
                        ACENTO_ESTADO_CURSO[curso.estado as keyof typeof ACENTO_ESTADO_CURSO] ??
                          "bg-muted-foreground/40"
                      )}
                      aria-hidden="true"
                    />
                    <CardHeader className="pt-4 pb-2 px-5">
                      <CardTitle className="font-heading text-base font-bold text-foreground group-hover:text-primary transition-colors text-balance">
                        {curso.titulo}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <Badge
                          variant={
                            VARIANTE_ESTADO_CURSO[
                              curso.estado as keyof typeof VARIANTE_ESTADO_CURSO
                            ] ?? "secondary"
                          }
                          className="font-semibold"
                        >
                          {curso.estado}
                        </Badge>
                        <span className="text-muted-foreground">
                          {curso.createdAt.toLocaleDateString("es-CO")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
