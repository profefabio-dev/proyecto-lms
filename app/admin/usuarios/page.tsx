import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Rol } from "@prisma/client";
import { EditEmailForm } from "@/components/edit-email-form";
import { EditUserNameForm } from "@/components/edit-user-name-form";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { ToggleUserStatusForm } from "@/components/toggle-user-status-form";
import { BulkImportStudentsForm } from "@/components/bulk-import-students-form";
import { AppShell } from "@/components/app-shell";
import { DataTable, Td, Th } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { etiquetaEstado, etiquetaRol } from "@/lib/etiquetas";
import { cn } from "@/lib/utils";
import { filtroUsuarioVisibleEnEspacio } from "@/lib/espacio-scope";

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

  // Épica Multi-docente (US24): un Administrador solo administra su propio
  // espacio — nunca hay un Administrador sin espacioId en la práctica una
  // vez aplicada la migración de la épica (todo Administrador existente
  // quedó asignado al espacio por defecto), pero se valida de todas formas
  // para no dejar pasar un caso raro sin manejar.
  if (!usuarioActual.espacioId) {
    redirect("/login");
  }

  const filtroRol = esRolValido(rol) ? rol : undefined;

  const usuarios = await prisma.users.findMany({
    where: filtroUsuarioVisibleEnEspacio(usuarioActual.espacioId, filtroRol),
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell usuario={usuarioActual}>
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <PageHeader
          titulo="Usuarios del sistema"
          descripcion="Listado de todos los administradores, tutores y estudiantes registrados."
          icono={Users}
          insignia={`${usuarios.length} ${usuarios.length === 1 ? "usuario" : "usuarios"}`}
        />

        {/* US29: un Administrador crea estudiantes sin inscribirlos a
            ningún curso (eso lo hace después un Tutor, criterio 10) —
            por eso este formulario nunca recibe la prop `cursos`. */}
        <BulkImportStudentsForm />

        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filtrar por rol">
          {ROLES_FILTRO.map(({ valor, etiqueta }) => {
            const activo = valor === "TODOS" ? !filtroRol : filtroRol === valor;
            const href = valor === "TODOS" ? "/admin/usuarios" : `/admin/usuarios?rol=${valor}`;

            return (
              <Link
                key={valor}
                href={href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "inline-flex items-center rounded-full border px-4 py-1.5 font-medium transition-colors touch:min-h-11",
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

        <DataTable anchoMinimo="44rem">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40">
              <Th primera>Nombre</Th>
              <Th>Email</Th>
              <Th>Rol</Th>
              <Th>Estado</Th>
              <Th ultima>Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {usuarios.length === 0 && (
              <tr>
                <Td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No hay usuarios {filtroRol ? "con ese rol" : "registrados"} todavía.
                </Td>
              </tr>
            )}
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="transition-colors hover:bg-muted/30">
                <Td primera className="min-w-[10rem] font-medium text-foreground">
                  {usuario.nombre} {usuario.apellido}
                </Td>
                <Td className="min-w-[13rem] break-all text-xs text-muted-foreground">{usuario.email}</Td>
                <Td>
                  <Badge
                    variant={usuario.rol === "ADMINISTRADOR" ? "default" : "outline"}
                    className="text-xs font-semibold"
                  >
                    {etiquetaRol(usuario.rol)}
                  </Badge>
                </Td>
                <Td>
                  <Badge
                    variant={usuario.estado === "ACTIVO" ? "success" : "secondary"}
                    className="text-xs font-semibold"
                  >
                    {etiquetaEstado(usuario.estado)}
                  </Badge>
                </Td>
                <Td ultima>
                  <div className="flex flex-wrap items-center gap-2">
                    <EditUserNameForm
                      usuarioId={usuario.id}
                      nombreActual={usuario.nombre}
                      apellidoActual={usuario.apellido}
                    />
                    <EditEmailForm usuarioId={usuario.id} emailActual={usuario.email} />
                    <ResetPasswordForm usuarioId={usuario.id} />
                    {usuario.id !== usuarioActual.id && (
                      <ToggleUserStatusForm usuarioId={usuario.id} estadoActual={usuario.estado} />
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </main>
    </AppShell>
  );
}
