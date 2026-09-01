import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateStudentForm } from "@/components/create-student-form";
import { EditEmailForm } from "@/components/edit-email-form";
import { EditUserNameForm } from "@/components/edit-user-name-form";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

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

  const estudiantes = await prisma.users.findMany({
    where: { rol: "ESTUDIANTE" },
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
                  <td className="space-y-1 py-2 pr-4">
                    <EditUserNameForm
                      usuarioId={estudiante.id}
                      nombreActual={estudiante.nombre}
                      apellidoActual={estudiante.apellido}
                    />
                    <EditEmailForm usuarioId={estudiante.id} emailActual={estudiante.email} />
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
