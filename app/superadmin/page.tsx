import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateEspacioForm } from "@/components/create-espacio-form";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== "SUPERADMIN") {
    redirect("/login");
  }

  // US25: listado de todos los espacios existentes, con cuántos usuarios
  // (Administradores + Tutores) tiene cada uno — los Estudiantes no cuentan
  // aquí, nunca pertenecen a un espacio propio (ver lib/espacio-scope.ts).
  // El desglose completo (cursos, estudiantes inscritos) y la posibilidad
  // de desactivar un espacio quedan para US27/US28.
  const espacios = await prisma.espacios.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { usuarios: true } },
    },
  });

  return (
    <AppShell usuario={usuarioActual}>
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Espacios de docentes</h1>
          <p className="text-sm text-muted-foreground">
            Cada espacio agrupa a un docente (o institución) con sus propios Administradores,
            Tutores y cursos, aislados del resto.
          </p>
        </div>

        <CreateEspacioForm />

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="py-2 pr-4 pl-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nombre
                </th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Usuarios
                </th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {espacios.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-muted-foreground">
                    No hay espacios registrados todavía.
                  </td>
                </tr>
              )}
              {espacios.map((espacio) => (
                <tr key={espacio.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="py-2 pr-4 pl-4">{espacio.nombre}</td>
                  <td className="py-2 pr-4">{espacio._count.usuarios}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={espacio.estado === "ACTIVO" ? "success" : "secondary"}>
                      {espacio.estado}
                    </Badge>
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
