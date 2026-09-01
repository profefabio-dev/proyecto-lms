import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Rol } from "@prisma/client";
import { EditEmailForm } from "@/components/edit-email-form";
import { EditUserNameForm } from "@/components/edit-user-name-form";
import { ToggleUserStatusForm } from "@/components/toggle-user-status-form";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROLES_FILTRO: { valor: Rol | "TODOS"; etiqueta: string }[] = [
  { valor: "TODOS", etiqueta: "Todos" },
  { valor: "ADMINISTRADOR", etiqueta: "Administradores" },
  { valor: "TUTOR", etiqueta: "Tutores" },
  { valor: "ESTUDIANTE", etiqueta: "Estudiantes" },
];

function esRolValido(valor: string | undefined): valor is Rol {
  return valor === "ADMINISTRADOR" || valor === "TUTOR" || valor === "ESTUDIANTE";
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ rol?: string }>;
}) {
  const { rol } = await searchParams;

  // Solo un Administrador autenticado puede ver el listado completo de
  // usuarios del sistema (mismo patrón de guarda usado en las páginas
  // de Tutor: verificar sesión y luego el rol contra la tabla Users).
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

  const filtroRol = esRolValido(rol) ? rol : undefined;

  const usuarios = await prisma.users.findMany({
    where: filtroRol ? { rol: filtroRol } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell usuario={usuarioActual}>
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios del sistema</h1>
          <p className="text-sm text-muted-foreground">
            Listado de todos los administradores, tutores y estudiantes registrados.
          </p>
        </div>

        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filtrar por rol">
          {ROLES_FILTRO.map(({ valor, etiqueta }) => {
            const activo = valor === "TODOS" ? !filtroRol : filtroRol === valor;
            const href = valor === "TODOS" ? "/admin/usuarios" : `/admin/usuarios?rol=${valor}`;

            return (
              <Link
                key={valor}
                href={href}
                className={cn(
                  "rounded-full border px-3 py-1 transition-colors",
                  activo
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {etiqueta}
              </Link>
            );
          })}
        </nav>

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="py-2 pr-4 pl-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rol</th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    No hay usuarios {filtroRol ? "con ese rol" : "registrados"} todavía.
                  </td>
                </tr>
              )}
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="py-2 pr-4 pl-4">
                    {usuario.nombre} {usuario.apellido}
                  </td>
                  <td className="py-2 pr-4 break-all">{usuario.email}</td>
                  <td className="py-2 pr-4">{usuario.rol}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={usuario.estado === "ACTIVO" ? "success" : "secondary"}>
                      {usuario.estado}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <EditUserNameForm
                        usuarioId={usuario.id}
                        nombreActual={usuario.nombre}
                        apellidoActual={usuario.apellido}
                      />
                      <EditEmailForm usuarioId={usuario.id} emailActual={usuario.email} />
                      {usuario.id !== usuarioActual.id && (
                        <ToggleUserStatusForm usuarioId={usuario.id} estadoActual={usuario.estado} />
                      )}
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
