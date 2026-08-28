import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function EstudiantePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== "ESTUDIANTE") {
    redirect("/login");
  }

  const inscripciones = await prisma.courseUsers.findMany({
    where: { userId: usuarioActual.id },
    include: { course: true },
    orderBy: { fecha: "desc" },
  });

  return (
    <main className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Panel de Estudiante</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Mis cursos</h2>

        {inscripciones.length === 0 ? (
          <p className="text-gray-500">Todavía no estás inscrito en ningún curso.</p>
        ) : (
          <ul className="space-y-1">
            {inscripciones.map((inscripcion) => (
              <li key={inscripcion.id}>
                <Link
                  href={`/estudiante/cursos/${inscripcion.course.id}`}
                  className="text-blue-600 underline"
                >
                  {inscripcion.course.titulo}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
