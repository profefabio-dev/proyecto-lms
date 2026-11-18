import { redirect } from "next/navigation";
import { Users, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateStudentForm } from "@/components/create-student-form";
import { BulkImportStudentsForm } from "@/components/bulk-import-students-form";
import { EditEmailForm } from "@/components/edit-email-form";
import { EditUserNameForm } from "@/components/edit-user-name-form";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { etiquetaEstado } from "@/lib/etiquetas";
import { filtroUsuarioVisibleEnEspacio } from "@/lib/espacio-scope";
import { Rol } from "@prisma/client";

export default async function EstudiantesPage() {
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

  // Épica Multi-docente (US24): antes de esto, un Tutor veía (y podía
  // editar/resetear la contraseña de) TODOS los Estudiantes de la
  // plataforma, sin importar si tenían algo que ver con sus cursos — un
  // vacío real, no solo un límite de la vista. Ahora se limita a los
  // Estudiantes con al menos una inscripción en un curso de su mismo
  // espacio (los Estudiantes son cuentas compartidas entre espacios, así
  // que no tienen espacioId propio — se filtran por inscripción real, ver
  // `lib/espacio-scope.ts`). Caso defensivo: todo Tutor existente quedó
  // con espacioId asignado por la migración de la épica.
  if (!usuarioActual.espacioId) {
    redirect("/login");
  }

  const estudiantes = await prisma.users.findMany({
    where: filtroUsuarioVisibleEnEspacio(usuarioActual.espacioId, Rol.ESTUDIANTE),
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Gestión de Estudiantes
            </h1>
            <p className="text-sm text-muted-foreground">
              Registra alumnos individualmente, realiza cargas masivas y gestiona credenciales de
              acceso.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-semibold text-xs">
              <Sparkles className="size-3 mr-1 text-primary" />
              {estudiantes.length}{" "}
              {estudiantes.length === 1 ? "alumno visible" : "alumnos visibles"}
            </Badge>
          </div>
        </div>

        {/* REGISTRO INDIVIDUAL Y CARGA MASIVA */}
        <div className="space-y-6">
          <CreateStudentForm />
          <BulkImportStudentsForm cursos={cursos} />
        </div>

        {/* LISTADO DE ESTUDIANTES */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-bold text-foreground">
              Alumnos Registrados en tu Espacio
            </h2>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {estudiantes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
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
