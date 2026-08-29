import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { construirConteoPorRol } from "@/lib/admin-stats";

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

  const indicadores = [
    { etiqueta: "Administradores", valor: usuariosPorRol.ADMINISTRADOR },
    { etiqueta: "Tutores", valor: usuariosPorRol.TUTOR },
    { etiqueta: "Estudiantes", valor: usuariosPorRol.ESTUDIANTE },
    { etiqueta: "Cursos activos", valor: cursosActivos },
    { etiqueta: "Contenidos totales", valor: totalContenidos },
  ];

  return (
    <main className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Panel de Administrador</h1>

      <section
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
        aria-label="Indicadores generales"
      >
        {indicadores.map((indicador) => (
          <div key={indicador.etiqueta} className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">{indicador.etiqueta}</p>
            <p className="text-2xl font-bold">{indicador.valor}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-1">
        <Link href="/admin/tutores" className="inline-block text-blue-600 underline">
          Gestionar tutores
        </Link>
        <Link href="/admin/usuarios" className="inline-block text-blue-600 underline">
          Ver todos los usuarios
        </Link>
      </div>
    </main>
  );
}
