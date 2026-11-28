import Link from "next/link";
// Corrección (27/11/2026): la página llama a `redirect()` tres veces y no lo
// importaba — no compilaba, así que `npm run verificar` y el CI fallaban y la
// pantalla habría dado error 500.
import { redirect } from "next/navigation";
import { Users, Sparkles, FolderKanban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateStudentForm } from "@/components/create-student-form";
import { BulkImportStudentsForm } from "@/components/bulk-import-students-form";
import { EditEmailForm } from "@/components/edit-email-form";
import { EditUserNameForm } from "@/components/edit-user-name-form";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { AssignGroupToStudent } from "@/components/assign-group-to-student";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { etiquetaEstado } from "@/lib/etiquetas";
import { filtroUsuarioVisibleEnEspacio } from "@/lib/espacio-scope";
import { Rol } from "@prisma/client";
import { cn } from "@/lib/utils";

export default async function EstudiantesPage({
  searchParams,
}: {
  searchParams?: Promise<{ grupo?: string }>;
  // El objeto va con valor por omisión: Next siempre lo pasa, pero las
  // pruebas de esta pantalla llaman `EstudiantesPage()` sin argumentos para
  // comprobar las tres redirecciones, y sin esto no compilan.
} = {}) {
  const { grupo: grupoFiltro } = (await searchParams) ?? {};

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

  if (!usuarioActual.espacioId) {
    redirect("/login");
  }

  const grupos = await prisma.grupos.findMany({
    where: { espacioId: usuarioActual.espacioId },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  const baseWhere = filtroUsuarioVisibleEnEspacio(usuarioActual.espacioId, Rol.ESTUDIANTE);
  const whereEstudiantes = grupoFiltro
    ? { ...baseWhere, grupoId: grupoFiltro }
    : baseWhere;

  const estudiantes = await prisma.users.findMany({
    where: whereEstudiantes,
    orderBy: { createdAt: "desc" },
  });

  const cursos = await prisma.courses.findMany({
    where: { tutorId: usuarioActual.id },
    select: { id: true, titulo: true },
    orderBy: { titulo: "asc" },
  });

  return (
    <AppShell usuario={usuarioActual} breadcrumbs={[{ label: "Estudiantes" }]}>
      <main className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6 py-8">
        {/* El formulario de registro individual vive dentro de un diálogo que
            abre este botón (OP07). La pantalla abre con el listado de
            alumnos y la opción de carga masiva, sin un formulario vacío. */}
        <PageHeader
          titulo="Gestión de Estudiantes"
          descripcion="Registra alumnos individualmente, realiza cargas masivas y gestiona credenciales de acceso."
          icono={Sparkles}
          insignia={`${estudiantes.length} ${estudiantes.length === 1 ? "alumno visible" : "alumnos visibles"}`}
          accion={<CreateStudentForm />}
        />

        {/* CARGA MASIVA (EXCEL O PDF) */}
        <div>
          <BulkImportStudentsForm cursos={cursos} />
        </div>

        {/* LISTADO DE ESTUDIANTES */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-bold text-foreground">
              Alumnos Registrados en tu Espacio
            </h2>
            <Link
              href="/tutor/grupos"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "ml-auto text-xs gap-1.5",
              )}
            >
              <FolderKanban className="size-3.5" />
              Gestionar grupos
            </Link>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
            <table className="w-full min-w-[36rem] text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-border/60 bg-muted/40">
                  <th className="py-3.5 pr-4 pl-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nombre
                  </th>
                  <th className="py-3.5 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Email Institucional
                  </th>
                  <th className="py-3.5 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Estado
                  </th>
                  <th className="py-3.5 pr-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Acciones
                  </th>
                  <th className="py-3.5 pr-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Grupo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {estudiantes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Aún no hay estudiantes registrados en tus cursos.
                    </td>
                  </tr>
                )}
                {estudiantes.map((estudiante) => (
                  <tr key={estudiante.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4 pl-5 font-medium text-foreground">
                      {estudiante.nombre} {estudiante.apellido}
                    </td>
                    <td className="min-w-[13rem] py-3 pr-4 text-muted-foreground break-all text-xs font-mono">
                      {estudiante.email}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={estudiante.estado === "ACTIVO" ? "success" : "secondary"}
                        className="font-semibold text-xs"
                      >
                        {etiquetaEstado(estudiante.estado)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <EditUserNameForm
                          usuarioId={estudiante.id}
                          nombreActual={estudiante.nombre}
                          apellidoActual={estudiante.apellido}
                        />
                        <EditEmailForm usuarioId={estudiante.id} emailActual={estudiante.email} />
                        <ResetPasswordForm usuarioId={estudiante.id} />
                      </div>
                    </td>
                    <td className="py-3 pr-5">
                      <AssignGroupToStudent
                        userId={estudiante.id}
                        grupoIdActual={estudiante.grupoId ?? null}
                        grupos={grupos}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
