import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { obtenerEstadoEstudiante } from "@/lib/course-status";
import { calcularProgreso } from "@/lib/course-progress";

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

  // US19: para calcular el % de avance de cada curso hace falta el total
  // de contenidos visibles (los ocultos no cuentan, igual que en la vista
  // de detalle) y cuántos de esos ya vio el estudiante autenticado.
  const inscripciones = await prisma.courseUsers.findMany({
    where: { userId: usuarioActual.id },
    include: {
      course: { include: { contenidos: { where: { visible: true }, select: { id: true } } } },
    },
    orderBy: { fecha: "desc" },
  });

  const idsContenidosVisibles = inscripciones.flatMap((inscripcion) =>
    inscripcion.course.contenidos.map((contenido) => contenido.id)
  );

  const vistos =
    idsContenidosVisibles.length === 0
      ? []
      : await prisma.contentViews.findMany({
          where: { userId: usuarioActual.id, contentId: { in: idsContenidosVisibles } },
          select: { contentId: true },
        });

  const idsVistos = new Set(vistos.map((visto) => visto.contentId));

  return (
    <main className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Panel de Estudiante</h1>

      <Link href="/estudiante/buscar" className="inline-block text-sm text-blue-600 underline">
        Buscar en mis cursos
      </Link>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Mis cursos</h2>

        {inscripciones.length === 0 ? (
          <p className="text-gray-500">Todavía no estás inscrito en ningún curso.</p>
        ) : (
          <ul className="space-y-4">
            {inscripciones.map((inscripcion) => {
              const estado = obtenerEstadoEstudiante(inscripcion.course.estado);
              const totalContenidos = inscripcion.course.contenidos.length;
              const contenidosVistos = inscripcion.course.contenidos.filter((contenido) =>
                idsVistos.has(contenido.id)
              ).length;
              const progreso = calcularProgreso(contenidosVistos, totalContenidos);

              return (
                <li key={inscripcion.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/estudiante/cursos/${inscripcion.course.id}`}
                      className="text-blue-600 underline"
                    >
                      {inscripcion.course.titulo}
                    </Link>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${estado.className}`}
                    >
                      {estado.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-40 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {progreso}% ({contenidosVistos}/{totalContenidos} contenidos)
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
