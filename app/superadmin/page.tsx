import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import { filtroUsuarioVisibleEnEspacio } from "@/lib/espacio-scope";
import { CreateEspacioForm } from "@/components/create-espacio-form";
import { ToggleEspacioStatusForm } from "@/components/toggle-espacio-status-form";
import { ResetEspacioAdminPasswordForm } from "@/components/reset-espacio-admin-password-form";
import { AppShell } from "@/components/app-shell";
import { DataTable, Td, Th } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { etiquetaEstado } from "@/lib/etiquetas";
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
        <PageHeader
          titulo="Espacios de docentes"
          descripcion="Cada espacio agrupa a un docente (o institución) con sus propios Administradores, Tutores y cursos, aislados del resto."
          icono={Building2}
          insignia={`${espaciosConDetalle.length} ${espaciosConDetalle.length === 1 ? "espacio" : "espacios"}`}
        />

        <CreateEspacioForm />

        <DataTable anchoMinimo="48rem">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40">
              <Th primera>Nombre</Th>
              <Th>Administrador</Th>
              <Th>Tutores</Th>
              <Th>Estudiantes</Th>
              <Th>Cursos</Th>
              <Th>Estado</Th>
              <Th ultima>Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {espaciosConDetalle.length === 0 && (
              <tr>
                <Td colSpan={7} className="py-8 text-center text-muted-foreground">
                  No hay espacios registrados todavía.
                </Td>
              </tr>
            )}
            {espaciosConDetalle.map((espacio) => (
              <tr key={espacio.id} className="transition-colors hover:bg-muted/30">
                <Td primera className="font-medium text-foreground">
                  {espacio.nombre}
                </Td>
                <Td>
                  {espacio.administradorPrincipal ? (
                    `${espacio.administradorPrincipal.nombre} ${espacio.administradorPrincipal.apellido}`
                  ) : (
                    <span className="text-muted-foreground">Sin administrador</span>
                  )}
                </Td>
                <Td>{espacio.cantidadTutores}</Td>
                <Td>{espacio.cantidadEstudiantes}</Td>
                <Td>{espacio.cantidadCursos}</Td>
                <Td>
                  <Badge
                    variant={espacio.estado === "ACTIVO" ? "success" : "secondary"}
                    className="text-xs font-semibold"
                  >
                    {etiquetaEstado(espacio.estado)}
                  </Badge>
                </Td>
                <Td ultima>
                  <div className="flex flex-col items-start gap-2">
                    <ToggleEspacioStatusForm espacioId={espacio.id} estadoActual={espacio.estado} />
                    {espacio.administradorPrincipal && (
                      <ResetEspacioAdminPasswordForm
                        administradorId={espacio.administradorPrincipal.id}
                      />
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
