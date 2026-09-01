import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, UserCog, GraduationCap, BookOpen, FileText, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { construirConteoPorRol } from "@/lib/admin-stats";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminPage() {
  // Igual que en app/admin/usuarios/page.tsx y app/tutor/*: verificar sesión
  // y luego el rol contra la tabla Users. Esta página no tenía guarda antes
  // de US04 — se agrega aquí junto con los indicadores.
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

  // Se consulta en cada carga de la página (Server Component sin caché), así
  // que los indicadores siempre reflejan el estado actual de la base de
  // datos — no hay un valor guardado que se pueda quedar desactualizado.
  const [usuariosPorRolCrudo, cursosActivos, totalContenidos] = await Promise.all([
    prisma.users.groupBy({ by: ["rol"], _count: { _all: true } }),
    prisma.courses.count({ where: { estado: "PUBLICADO" } }),
    prisma.contents.count(),
  ]);

  const usuariosPorRol = construirConteoPorRol(usuariosPorRolCrudo);

  const indicadores: { etiqueta: string; valor: number; icon: LucideIcon }[] = [
    { etiqueta: "Administradores", valor: usuariosPorRol.ADMINISTRADOR, icon: ShieldCheck },
    { etiqueta: "Tutores", valor: usuariosPorRol.TUTOR, icon: UserCog },
    { etiqueta: "Estudiantes", valor: usuariosPorRol.ESTUDIANTE, icon: GraduationCap },
    { etiqueta: "Cursos activos", valor: cursosActivos, icon: BookOpen },
    { etiqueta: "Contenidos totales", valor: totalContenidos, icon: FileText },
  ];

  return (
    <AppShell usuario={usuarioActual}>
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Panel de Administrador</h1>

        <section
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
          aria-label="Indicadores generales"
        >
          {indicadores.map((indicador) => {
            const Icono = indicador.icon;
            return (
              <Card key={indicador.etiqueta}>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Icono className="size-4 text-primary" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">{indicador.etiqueta}</p>
                  </div>
                  <p className="text-2xl font-bold">{indicador.valor}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <div className="flex flex-col gap-2">
          <Link href="/admin/tutores" className="font-medium text-primary hover:underline">
            Gestionar tutores
          </Link>
          <Link href="/admin/usuarios" className="font-medium text-primary hover:underline">
            Ver todos los usuarios
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
