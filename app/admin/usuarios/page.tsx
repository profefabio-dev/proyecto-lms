import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Rol } from "@prisma/client";

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
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-bold">Usuarios del sistema</h1>
        <p className="text-sm text-gray-500">
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
              className={`rounded-full border px-3 py-1 transition-colors ${
                activo ? "border-black bg-black text-white" : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {etiqueta}
            </Link>
          );
        })}
      </nav>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Nombre</th>
            <th className="py-2">Email</th>
            <th className="py-2">Rol</th>
            <th className="py-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-gray-500">
                No hay usuarios {filtroRol ? "con ese rol" : "registrados"} todavía.
              </td>
            </tr>
          )}
          {usuarios.map((usuario) => (
            <tr key={usuario.id} className="border-b">
              <td className="py-2">
                {usuario.nombre} {usuario.apellido}
              </td>
              <td className="py-2">{usuario.email}</td>
              <td className="py-2">{usuario.rol}</td>
              <td className="py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    usuario.estado === "ACTIVO"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {usuario.estado}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
