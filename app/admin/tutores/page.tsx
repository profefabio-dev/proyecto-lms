import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateTutorForm } from "@/components/create-tutor-form";
import { EditEmailForm } from "@/components/edit-email-form";
import { EditUserNameForm } from "@/components/edit-user-name-form";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Rol } from "@prisma/client";

export default async function TutoresPage() {
  // Esta página no tenía guarda de sesión/rol antes de este pase de
  // diseño — se agrega aquí junto con el header, siguiendo el mismo
  // patrón ya usado en el resto de páginas de Admin (era un vacío real:
  // cualquier persona con sesión activa, sin importar su rol, podía
  // entrar a /admin/tutores y crear tutores nuevos).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== "ADMINISTRADOR") {
    redirect("/login");
  }

  // Épica Multi-docente (US24): un Administrador solo ve/gestiona los
  // Tutores de su propio espacio. Caso defensivo — todo Administrador
  // existente quedó con espacioId asignado por la migración de la épica.
  if (!usuarioActual.espacioId) {
    redirect("/login");
  }

  const tutores = await prisma.users.findMany({
    where: { rol: Rol.TUTOR, espacioId: usuarioActual.espacioId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell usuario={usuarioActual}>
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Tutores</h1>

        <CreateTutorForm />

        <div>
          <h2 className="mb-2 text-lg font-semibold">Tutores registrados</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="py-2 pr-4 pl-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</th>
                  <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
                  <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
                  <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tutores.map((tutor) => (
                  <tr key={tutor.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="py-2 pr-4 pl-4">{tutor.nombre} {tutor.apellido}</td>
                    <td className="py-2 pr-4 break-all">{tutor.email}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={tutor.estado === "ACTIVO" ? "success" : "secondary"}>
                        {tutor.estado}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <EditUserNameForm
                          usuarioId={tutor.id}
                          nombreActual={tutor.nombre}
                          apellidoActual={tutor.apellido}
                        />
                        <EditEmailForm usuarioId={tutor.id} emailActual={tutor.email} />
                        <ResetPasswordForm usuarioId={tutor.id} />
                      </div>
                    </td>
                  </tr>
                ))}
                {tutores.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">
                      Todavía no hay tutores registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
