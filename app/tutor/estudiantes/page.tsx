import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateStudentForm } from "@/components/create-student-form";
import { EditEmailForm } from "@/components/edit-email-form";
import { EditUserNameForm } from "@/components/edit-user-name-form";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
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

  return (
    <AppShell usuario={usuarioActual}>
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Estudiantes</h1>

        <CreateStudentForm />

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b bg-muted/50">
                <th className="py-2 pr-4 pl-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 pl-4 text-muted-foreground">
                    Aún no hay estudiantes registrados.
                  </td>
                </tr>
              )}
              {estudiantes.map((estudiante) => (
                <tr key={estudiante.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="py-2 pr-4 pl-4">
                    {estudiante.nombre} {estudiante.apellido}
                  </td>
                  <td className="py-2 pr-4 break-all">{estudiante.email}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={estudiante.estado === "ACTIVO" ? "success" : "secondary"}>
                      {estudiante.estado}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap items-center gap-1.5">
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
      </main>
    </AppShell>
  );
}
