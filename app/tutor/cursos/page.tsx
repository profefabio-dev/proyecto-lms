import { redirect } from "next/navigation";
import { ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateCourseForm } from "@/components/create-course-form";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <AppShell usuario={usuarioActual}>
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Mis Cursos</h1>

        <CreateCourseForm />

        {cursos.length === 0 ? (
          <EmptyState icon={ImageOff} message="Aún no has creado ningún curso." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cursos.map((curso) => (
              <Link key={curso.id} href={`/tutor/cursos/${curso.id}`} className="group block">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  {curso.imagen ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria provista por el tutor, no un asset local optimizable por next/image
                    <img
                      src={curso.imagen}
                      alt=""
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-muted">
                      <ImageOff className="size-8 text-muted-foreground/50" aria-hidden="true" />
                    </div>
                  )}
                  <CardContent className="space-y-2">
                    <p className="font-medium text-foreground group-hover:text-primary group-hover:underline">
                      {curso.titulo}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant={VARIANTE_ESTADO_CURSO[curso.estado as keyof typeof VARIANTE_ESTADO_CURSO] ?? "secondary"}>
                        {curso.estado}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {curso.createdAt.toLocaleDateString("es-CO")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}