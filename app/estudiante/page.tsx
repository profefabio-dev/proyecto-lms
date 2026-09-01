import Link from "next/link";
import { redirect } from "next/navigation";
import { ImageOff, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { obtenerEstadoEstudiante } from "@/lib/course-status";
import { calcularProgreso } from "@/lib/course-progress";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";

export default async function EstudiantePage() {
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

  // US19: para calcular el % de avance de cada curso hace falta el total
  // de contenidos visibles (los ocultos no cuentan, igual que en la vista
  // de detalle) y cuántos de esos ya vio el estudiante autenticado.
  const inscripciones = await prisma.courseUsers.findMany({
    where: { userId: usuarioActual.id },
    include: {
      course: { include: { contenidos: { where: { visible: true }, select: { id: true } } } },
    },
    orderBy: { fecha: "desc" },
  });

  const idsContenidosVisibles = inscripciones.flatMap((inscripcion) =>
    inscripcion.course.contenidos.map((contenido) => contenido.id)
  );

  const vistos =
    idsContenidosVisibles.length === 0
      ? []
      : await prisma.contentViews.findMany({
          where: { userId: usuarioActual.id, contentId: { in: idsContenidosVisibles } },
          select: { contentId: true },
        });

  const idsVistos = new Set(vistos.map((visto) => visto.contentId));

  return (
    <AppShell usuario={usuarioActual}>
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Panel de Estudiante</h1>

        <Link href="/estudiante/buscar" className="inline-block text-sm font-medium text-primary hover:underline">
          Buscar en mis cursos
        </Link>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Mis cursos</h2>

          {inscripciones.length === 0 ? (
            <EmptyState icon={BookOpen} message="Todavía no estás inscrito en ningún curso." />
          ) : (
            <ul className="space-y-3">
              {inscripciones.map((inscripcion) => {
                const estado = obtenerEstadoEstudiante(inscripcion.course.estado);
                const totalContenidos = inscripcion.course.contenidos.length;
                const contenidosVistos = inscripcion.course.contenidos.filter((contenido) =>
                  idsVistos.has(contenido.id)
                ).length;
                const progreso = calcularProgreso(contenidosVistos, totalContenidos);

                return (
                  <li key={inscripcion.id} className="flex gap-4 rounded-lg border bg-card p-4">
                    {inscripcion.course.imagen ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria provista por el tutor
                      <img
                        src={inscripcion.course.imagen}
                        alt=""
                        className="hidden aspect-video w-32 shrink-0 rounded-md object-cover sm:block"
                      />
                    ) : (
                      <div className="hidden aspect-video w-32 shrink-0 items-center justify-center rounded-md bg-muted sm:flex">
                        <ImageOff className="size-5 text-muted-foreground/50" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/estudiante/cursos/${inscripcion.course.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {inscripcion.course.titulo}
                        </Link>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${estado.className}`}
                        >
                          {estado.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${progreso}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {progreso}% ({contenidosVistos}/{totalContenidos} contenidos)
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
