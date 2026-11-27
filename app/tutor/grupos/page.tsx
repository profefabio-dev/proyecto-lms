import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, GraduationCap, ArrowRight, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { EditGroupDialog } from "@/components/edit-group-dialog";
import { DeleteGroupDialog } from "@/components/delete-group-dialog";
import { colorDeGrupo } from "@/lib/group-color";
import { cn } from "@/lib/utils";

/**
 * US32 (26/11/2026): Gestión de Grupos Escolares (salones de clase).
 * Permite a docentes y administradores ver y gestionar los salones de su colegio,
 * ver cuántos estudiantes pertenecen a cada uno y matricular salones completos.
 */
export default async function GruposPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || (usuarioActual.rol !== "TUTOR" && usuarioActual.rol !== "ADMINISTRADOR")) {
    redirect("/login");
  }

  if (!usuarioActual.espacioId) {
    redirect("/login");
  }

  const grupos = await prisma.grupos.findMany({
    where: { espacioId: usuarioActual.espacioId },
    include: {
      _count: {
        select: { estudiantes: true },
      },
    },
    orderBy: { nombre: "asc" },
  });

  return (
    <AppShell usuario={usuarioActual} breadcrumbs={[{ label: "Grupos escolares" }]}>
      <main className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6 py-8">
        <PageHeader
          titulo="Grupos Escolares"
          descripcion="Gestiona los salones de tu institución (ej. 6A, 7B) y matricúlalos en tus cursos en un clic."
          icono={Users}
          insignia={`${grupos.length} ${grupos.length === 1 ? "grupo" : "grupos"}`}
          accion={<CreateGroupDialog />}
        />

        {grupos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-4 bg-muted/20">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="size-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="font-heading text-lg font-bold text-foreground">
                No hay grupos creados todavía
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Crea los salones de tu colegio para poder matricular a todos sus alumnos en tus asignaturas con un solo clic.
              </p>
            </div>
            <div className="pt-2">
              <CreateGroupDialog />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {grupos.map((grupo) => {
              const totalEstudiantes = grupo._count.estudiantes;
              const estiloColor = colorDeGrupo(grupo.nombre);

              return (
                <div
                  key={grupo.id}
                  className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between gap-4 transition-all hover:border-primary/40"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-sm font-bold tracking-wide shadow-2xs",
                          // Corrección (27/11/2026): `colorDeGrupo` devuelve
                          // `{ borde, insignia }` — no existen `fondo` ni
                          // `texto`, así que esto no compilaba y la insignia
                          // se habría quedado sin color. `insignia` ya trae
                          // el fondo y el texto de la paleta de 8 colores
                          // estables por nombre de grupo (16/09/2026).
                          estiloColor.insignia
                        )}
                      >
                        {grupo.nombre}
                      </span>

                      <div className="flex items-center gap-1">
                        <EditGroupDialog grupoId={grupo.id} nombreActual={grupo.nombre} />
                        <DeleteGroupDialog
                          grupoId={grupo.id}
                          nombreGrupo={grupo.nombre}
                          totalEstudiantes={totalEstudiantes}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <GraduationCap className="size-4 text-primary" aria-hidden="true" />
                      <span>
                        <strong className="text-foreground font-semibold">
                          {totalEstudiantes}
                        </strong>{" "}
                        {totalEstudiantes === 1 ? "estudiante" : "estudiantes"}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-3">
                    <Link
                      href={`/tutor/estudiantes?grupo=${grupo.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <span>Ver estudiantes del grupo</span>
                      <ArrowRight className="size-3" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </AppShell>
  );
}
