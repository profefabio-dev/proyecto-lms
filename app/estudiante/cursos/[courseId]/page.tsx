import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { crearUrlDescarga } from "@/lib/supabase/storage";

export default async function CursoEstudiantePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

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

  const curso = await prisma.courses.findUnique({
    where: { id: courseId },
    include: {
      contenidos: {
        orderBy: { orden: "asc" },
        include: { documentos: true },
      },
    },
  });

  if (!curso) {
    notFound();
  }

  // Un estudiante solo puede ver el contenido de cursos donde está
  // inscrito (US11): sin esta verificación, cualquier estudiante con
  // sesión activa podría entrar a cualquier curso adivinando su id.
  const inscripcion = await prisma.courseUsers.findFirst({
    where: { courseId: curso.id, userId: usuarioActual.id },
  });

  if (!inscripcion) {
    notFound();
  }

  const contenidosVisibles = curso.contenidos.filter((contenido) => contenido.visible);

  // Las URLs de descarga son firmadas y de corta duración (US09/US16), así
  // que se generan en cada carga de la página en vez de guardarse.
  const contenidosConDocumentos = await Promise.all(
    contenidosVisibles.map(async (contenido) => {
      if (contenido.tipo !== "DOCUMENTO") {
        return { ...contenido, documentosConUrl: [] };
      }

      const documentosConUrl = await Promise.all(
        contenido.documentos.map(async (documento) => ({
          ...documento,
          url: await crearUrlDescarga(documento.archivo),
        }))
      );

      return { ...contenido, documentosConUrl };
    })
  );

  return (
    <main className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">{curso.titulo}</h1>
      <p className="text-gray-600">{curso.descripcion}</p>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Contenido del curso</h2>

        {contenidosConDocumentos.length === 0 ? (
          <p className="text-gray-500">Este curso todavía no tiene contenido publicado.</p>
        ) : (
          <ul className="space-y-6">
            {contenidosConDocumentos.map((contenido) => (
              <li key={contenido.id} className="space-y-2">
                <h3 className="font-medium">{contenido.titulo}</h3>
                {contenido.descripcion && (
                  <p className="text-sm text-gray-600">{contenido.descripcion}</p>
                )}
                {contenido.tipo === "VIDEO" && (
                  <YoutubeEmbed url={contenido.contenido} titulo={contenido.titulo} />
                )}
                {contenido.tipo === "DOCUMENTO" && (
                  <ul className="list-disc list-inside space-y-1">
                    {contenido.documentosConUrl.map((documento) =>
                      documento.url ? (
                        <li key={documento.id}>
                          <a
                            href={documento.url}
                            className="text-blue-600 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {documento.nombre}
                          </a>
                        </li>
                      ) : (
                        <li key={documento.id} className="text-gray-500">
                          {documento.nombre} (no se pudo generar el enlace de descarga)
                        </li>
                      )
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
