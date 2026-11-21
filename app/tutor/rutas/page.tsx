import Link from "next/link";
import { redirect } from "next/navigation";
import { Route, Users, BookOpen, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateRutaForm } from "@/components/create-ruta-form";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";

/**
 * US44 — las rutas de aprendizaje del Tutor.
 *
 * Una ruta agrupa varios de sus cursos en un orden pensado, y es lo que el
 * estudiante puede recorrer de principio a fin viendo un solo avance. Esta
 * pantalla es la lista: crear, ver cuántos cursos y cuántos estudiantes
 * tiene cada una, y entrar a armarla.
 */
export default async function RutasTutorPage() {
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

  const rutas = await prisma.rutas.findMany({
    where: { tutorId: usuarioActual.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { cursos: true, inscritos: true } } },
  });

  return (
    <AppShell usuario={usuarioActual} breadcrumbs={[{ label: "Rutas de aprendizaje" }]}>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <PageHeader
          titulo="Rutas de Aprendizaje"
          descripcion="Encadena varios cursos en un recorrido con sentido: el estudiante se asocia a la ruta y ve un solo avance para todo el camino."
          icono={Route}
          insignia={`${rutas.length} ${rutas.length === 1 ? "ruta creada" : "rutas creadas"}`}
          accion={<CreateRutaForm />}
        />

        <section className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground">Mis rutas</h2>

          {rutas.length === 0 ? (
            <EmptyState
              icon={Route}
              message="Todavía no has creado ninguna ruta. Una ruta es una secuencia de tus cursos: por ejemplo informática básica, luego ofimática, luego robótica."
            />
          ) : (
            <ul className="space-y-3">
              {rutas.map((ruta) => (
                <li key={ruta.id}>
                  <Link
                    href={`/tutor/rutas/${ruta.id}`}
                    className="group flex items-center gap-4 rounded-2xl border border-border/80 bg-card p-5 transition-colors hover:border-primary/40"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Route className="size-6" aria-hidden="true" />
                    </span>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-base font-bold text-foreground transition-colors group-hover:text-primary">
                          {ruta.titulo}
                        </h3>
                        <Badge
                          variant={ruta.estado === "PUBLICADA" ? "success" : "warning"}
                          className="font-semibold"
                        >
                          {ruta.estado === "PUBLICADA" ? "Publicada" : "Borrador"}
                        </Badge>
                      </div>

                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {ruta.descripcion}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-medium text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="size-3.5 text-muted-foreground" />
                          {ruta._count.cursos} {ruta._count.cursos === 1 ? "curso" : "cursos"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="size-3.5 text-muted-foreground" />
                          {ruta._count.inscritos}{" "}
                          {ruta._count.inscritos === 1 ? "estudiante" : "estudiantes"}
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
