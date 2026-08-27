import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateStudentForm } from "@/components/create-student-form";

export default async function EstudiantesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== "TUTOR") {
    redirect("/login");
  }

  const estudiantes = await prisma.users.findMany({
    where: { rol: "ESTUDIANTE" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Gestión de Estudiantes</h1>

      <CreateStudentForm />

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Nombre</th>
            <th className="py-2">Email</th>
            <th className="py-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {estudiantes.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-gray-500">
                Aún no hay estudiantes registrados.
              </td>
            </tr>
          )}
          {estudiantes.map((estudiante) => (
            <tr key={estudiante.id} className="border-b">
              <td className="py-2">
                {estudiante.nombre} {estudiante.apellido}
              </td>
              <td className="py-2">{estudiante.email}</td>
              <td className="py-2">{estudiante.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}