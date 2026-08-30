import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { construirFiltroBusqueda } from "@/lib/search";

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

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

  const termino = (q ?? "").trim();

  // US17: la búsqueda solo mira los cursos donde el estudiante está
  // inscrito y los contenidos visibles dentro de esos cursos — mismo
  // límite de acceso que ya aplica en el resto de /estudiante (US11 para
  // la inscripción, US12 para lo oculto), para no dejar "descubrir" por
  // la búsqueda contenido al que de otra forma no se puede entrar.
  const [cursos, contenidos] =
    termino.length === 0
      ? [[], []]
      : await Promise.all([
          prisma.courses.findMany({
            where: {
              inscritos: { some: { userId: usuarioActual.id } },
              ...construirFiltroBusqueda(termino),
            },
            orderBy: { titulo: "asc" },
          }),
          prisma.contents.findMany({
            where: {
              visible: true,
              course: { inscritos: { some: { userId: usuarioActual.id } } },
              ...construirFiltroBusqueda(termino),
            },
            include: { course: true },
            orderBy: { titulo: "asc" },
          }),
        ]);

  const sinResultados = termino.length > 0 && cursos.length === 0 && contenidos.length === 0;

  return (
    <main className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Buscar</h1>

      <form method="get" className="flex max-w-md gap-2">
        <input
          type="search"
          name="q"
          defaultValue={termino}
          placeholder="Buscar en mis cursos..."
          aria-label="Buscar en mis cursos"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-black px-4 py-2 text-sm text-white">
          Buscar
        </button>
      </form>

      {termino.length === 0 && (
        <p className="text-gray-500">Escribe una palabra clave para buscar en tus cursos.</p>
      )}

      {sinResultados && (
        <p className="text-gray-500">Sin resultados para &quot;{termino}&quot;.</p>
      )}

      {(cursos.length > 0 || contenidos.length > 0) && (
        <div className="space-y-8">
          {cursos.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xl font-semibold">Cursos ({cursos.length})</h2>
              <ul className="space-y-1">
                {cursos.map((curso) => (
                  <li key={curso.id}>
                    <Link
                      href={`/estudiante/cursos/${curso.id}`}
                      className="text-blue-600 underline"
                    >
                      {curso.titulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {contenidos.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xl font-semibold">Contenidos ({contenidos.length})</h2>
              <ul className="space-y-1">
                {contenidos.map((contenido) => (
                  <li key={contenido.id}>
                    <Link
                      href={`/estudiante/cursos/${contenido.courseId}`}
                      className="text-blue-600 underline"
                    >
                      {contenido.titulo}
                    </Link>
                    <span className="ml-2 text-xs text-gray-500">
                      en {contenido.course.titulo}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
