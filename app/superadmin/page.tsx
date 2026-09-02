import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import { filtroUsuarioVisibleEnEspacio } from "@/lib/espacio-scope";
import { CreateEspacioForm } from "@/components/create-espacio-form";
import { ToggleEspacioStatusForm } from "@/components/toggle-espacio-status-form";
import { ResetEspacioAdminPasswordForm } from "@/components/reset-espacio-admin-password-form";
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

  // US25/US27: listado de todos los espacios existentes. `usuarios` acá
  // solo trae Administradores y Tutores (son los únicos roles con
  // `espacioId` propio — ver prisma/schema.prisma), ordenados por
  // antigüedad para poder tomar el primer Administrador como "principal".
  const espacios = await prisma.espacios.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      usuarios: { orderBy: { createdAt: "asc" } },
    },
  });

  // Cursos y Estudiantes no cuelgan directamente de Espacios en el modelo
  // (los cursos son de un Tutor, los Estudiantes se consideran "del
  // espacio" por inscripción — ver lib/espacio-scope.ts), así que se
  // consultan aparte por cada espacio.
  const espaciosConDetalle = await Promise.all(
    espacios.map(async (espacio) => {
      const administradorPrincipal =
        espacio.usuarios.find((usuario) => usuario.rol === Rol.ADMINISTRADOR) ?? null;
      const cantidadTutores = espacio.usuarios.filter(
        (usuario) => usuario.rol === Rol.TUTOR
      ).length;

      const [cantidadCursos, cantidadEstudiantes] = await Promise.all([
        prisma.courses.count({ where: { tutor: { espacioId: espacio.id } } }),
        prisma.users.count({ where: filtroUsuarioVisibleEnEspacio(espacio.id, Rol.ESTUDIANTE) }),
      ]);

      return { ...espacio, administradorPrincipal, cantidadTutores, cantidadCursos, cantidadEstudiantes };
    })
  );

  return (
    <AppShell usuario={usuarioActual}>
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Espacios de docentes</h1>
          <p className="text-sm text-muted-foreground">
            Cada espacio agrupa a un docente (o institución) con sus propios Administradores,
            Tutores y cursos, aislados del resto.
          </p>
        </div>

        <CreateEspacioForm />

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="py-2 pr-4 pl-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nombre
                </th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Administrador
                </th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tutores
                </th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Estudiantes
                </th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cursos
                </th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Estado
                </th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {espaciosConDetalle.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-muted-foreground">
                    No hay espacios registrados todavía.
                  </td>
                </tr>
              )}
              {espaciosConDetalle.map((espacio) => (
                <tr key={espacio.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="py-2 pr-4 pl-4">{espacio.nombre}</td>
                  <td className="py-2 pr-4">
                    {espacio.administradorPrincipal
                      ? `${espacio.administradorPrincipal.nombre} ${espacio.administradorPrincipal.apellido}`
                      : "— sin Administrador —"}
                  </td>
                  <td className="py-2 pr-4">{espacio.cantidadTutores}</td>
                  <td className="py-2 pr-4">{espacio.cantidadEstudiantes}</td>
                  <td className="py-2 pr-4">{espacio.cantidadCursos}</td>
                  <td className="py-2 pr-4">
                    <Badge variant={espacio.estado === "ACTIVO" ? "success" : "secondary"}>
                      {espacio.estado}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-col items-start gap-2">
                      <ToggleEspacioStatusForm espacioId={espacio.id} estadoActual={espacio.estado} />
                      {espacio.administradorPrincipal && (
                        <ResetEspacioAdminPasswordForm
                          administradorId={espacio.administradorPrincipal.id}
                        />
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
