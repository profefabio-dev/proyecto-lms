import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateCourseForm } from "@/components/create-course-form";
import Link from "next/link";

export default async function CursosPage() {
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

  const cursos = await prisma.courses.findMany({
    where: { tutorId: usuarioActual.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Mis Cursos</h1>

      <CreateCourseForm />

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Título</th>
            <th className="py-2">Estado</th>
            <th className="py-2">Creado</th>
          </tr>
        </thead>
        <tbody>
          {cursos.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-gray-500">
                Aún no has creado ningún curso.
              </td>
            </tr>
          )}
          {cursos.map((curso) => (
            <tr key={curso.id} className="border-b">
              <td className="py-2">
                 <Link href={`/tutor/cursos/${curso.id}`} className="text-blue-600 underline">
                    {curso.titulo}
                 </Link>
              </td>
              <td className="py-2">{curso.estado}</td>
              <td className="py-2">{curso.createdAt.toLocaleDateString("es-CO")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}