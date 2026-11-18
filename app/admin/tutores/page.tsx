import { redirect } from "next/navigation";
import { UserCog, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateTutorForm } from "@/components/create-tutor-form";
import { EditEmailForm } from "@/components/edit-email-form";
import { EditUserNameForm } from "@/components/edit-user-name-form";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { AppShell } from "@/components/app-shell";
import { DataTable, Td, Th } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { etiquetaEstado } from "@/lib/etiquetas";
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
        <PageHeader
          titulo="Gestión de Tutores"
          descripcion="Crea cuentas de tutor y administra sus datos de acceso."
          icono={UserCog}
          insignia={`${tutores.length} ${tutores.length === 1 ? "tutor" : "tutores"}`}
        />

        <CreateTutorForm />

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" aria-hidden="true" />
            <h2 className="font-heading text-xl font-bold text-foreground">Tutores registrados</h2>
          </div>

          <DataTable>
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <Th primera>Nombre</Th>
                <Th>Email</Th>
                <Th>Estado</Th>
                <Th ultima>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {tutores.length === 0 && (
                <tr>
                  <Td colSpan={4} className="py-8 text-center text-muted-foreground">
                    Todavía no hay tutores registrados.
                  </Td>
                </tr>
              )}
              {tutores.map((tutor) => (
                <tr key={tutor.id} className="transition-colors hover:bg-muted/30">
                  <Td primera className="font-medium text-foreground">
                    {tutor.nombre} {tutor.apellido}
                  </Td>
                  <Td className="min-w-[13rem] break-all text-xs text-muted-foreground">{tutor.email}</Td>
                  <Td>
                    <Badge
                      variant={tutor.estado === "ACTIVO" ? "success" : "secondary"}
                      className="text-xs font-semibold"
                    >
                      {etiquetaEstado(tutor.estado)}
                    </Badge>
                  </Td>
                  <Td ultima>
                    <div className="flex flex-wrap items-center gap-2">
                      <EditUserNameForm
                        usuarioId={tutor.id}
                        nombreActual={tutor.nombre}
                        apellidoActual={tutor.apellido}
                      />
                      <EditEmailForm usuarioId={tutor.id} emailActual={tutor.email} />
                      <ResetPasswordForm usuarioId={tutor.id} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </section>
      </main>
    </AppShell>
  );
}
