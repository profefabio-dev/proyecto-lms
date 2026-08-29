import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function TutorPage() {
  // Igual que en app/admin/page.tsx (US04): esta página tampoco tenía
  // guarda de sesión/rol antes de US18 — cualquier persona con sesión
  // activa podía entrar directamente a /tutor sin ser Tutor.
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

  // US18: métricas clave del Tutor (cursos, estudiantes, contenidos), sin
  // necesidad de navegar a otras pantallas. Se consultan en cada carga de
  // la página, así que siempre reflejan el estado actual de la base de
  // datos — mismo criterio ya usado en el dashboard del Admin (US04).
  const cursosDelTutor = await prisma.courses.findMany({
    where: { tutorId: usuarioActual.id },
    select: { id: true },
  });
  const idsCursos = cursosDelTutor.map((curso) => curso.id);

  const [inscripciones, totalContenidos] = await Promise.all([
    prisma.courseUsers.findMany({
      where: { courseId: { in: idsCursos } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.contents.count({ where: { courseId: { in: idsCursos } } }),
  ]);

  const indicadores = [
    { etiqueta: "Mis cursos", valor: cursosDelTutor.length },
    { etiqueta: "Estudiantes inscritos", valor: inscripciones.length },
    { etiqueta: "Contenidos publicados", valor: totalContenidos },
  ];

  return (
    <main className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Panel de Tutor</h1>

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        aria-label="Indicadores generales"
      >
        {indicadores.map((indicador) => (
          <div key={indicador.etiqueta} className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">{indicador.etiqueta}</p>
            <p className="text-2xl font-bold">{indicador.valor}</p>
          </div>
        ))}
      </section>

      <div className="space-x-4">
        <Link href="/tutor/estudiantes" className="text-blue-600 underline">
          Gestionar estudiantes
        </Link>
        <Link href="/tutor/cursos" className="text-blue-600 underline">
          Gestionar cursos
        </Link>
      </div>
    </main>
  );
}
