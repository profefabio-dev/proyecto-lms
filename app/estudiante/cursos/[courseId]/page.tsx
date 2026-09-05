import { redirect, notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { MarkdownContent } from "@/components/markdown-content";
import { DocumentContentList } from "@/components/document-content-list";
import { crearUrlDescarga } from "@/lib/supabase/storage";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { CourseContentItem } from "@/components/course-content-item";
import { CourseContentOutline } from "@/components/course-content-outline";
import { calcularProgreso } from "@/lib/course-progress";

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

  // US19 (rediseño): "visto" ya no se marca solo con abrir esta página —
  // eso marcaba TODOS los contenidos a la vez sin que el estudiante
  // interactuara con ninguno, porque todos se muestran juntos en la
  // misma página. Ahora hace falta el clic del estudiante en
  // <MarkContentViewedButton>; aquí solo se consulta cuáles ya están
  // marcados, para no mostrarle el botón a algo que ya confirmó antes.
  const vistos =
    contenidosVisibles.length === 0
      ? []
      : await prisma.contentViews.findMany({
          where: {
            userId: usuarioActual.id,
            contentId: { in: contenidosVisibles.map((contenido) => contenido.id) },
          },
          select: { contentId: true },
        });

  const idsVistos = new Set(vistos.map((visto) => visto.contentId));

  // US31 (05/09/2026): resumen de avance (mismo cálculo que ya usa US19 en
  // `/estudiante`), mostrado ahora en la barra lateral de la página junto
  // con el índice de contenidos — ver `CourseContentOutline`.
  const progreso = calcularProgreso(idsVistos.size, contenidosVisibles.length);

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
    <AppShell
      usuario={usuarioActual}
      breadcrumbs={[{ label: "Mis cursos", href: "/estudiante" }, { label: curso.titulo }]}
    >
      {/* US31, segunda vuelta (05/09/2026): el docente confirmó que la
          primera versión seguía "desaprovechando" la pantalla — mucho
          espacio en blanco a los lados en monitores anchos, porque todo
          quedaba en un único contenedor angosto centrado. En vez de
          ensanchar las tarjetas de contenido (líneas de texto demasiado
          largas para leer cómodo), ese ancho extra ahora lo ocupa una
          barra lateral real: resumen de avance + índice de navegación
          (`CourseContentOutline`), como haría cualquier LMS con ese
          espacio disponible. */}
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{curso.titulo}</h1>
          {curso.descripcion && (
            <p className="text-balance text-muted-foreground">{curso.descripcion}</p>
          )}
        </div>

        {contenidosConDocumentos.length === 0 ? (
          <EmptyState icon={Inbox} message="Este curso todavía no tiene contenido publicado." />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <section className="order-2 space-y-4 lg:order-1">
              <h2 className="text-xl font-semibold">Contenido del curso</h2>

              <ul className="space-y-10">
                {contenidosConDocumentos.map((contenido, index) => (
                  <CourseContentItem
                    key={contenido.id}
                    numero={index + 1}
                    index={index}
                    titulo={contenido.titulo}
                    descripcion={contenido.descripcion}
                    tipo={contenido.tipo}
                    contentId={contenido.id}
                    visto={idsVistos.has(contenido.id)}
                  >
                    {contenido.tipo === "VIDEO" && (
                      <YoutubeEmbed url={contenido.contenido} titulo={contenido.titulo} />
                    )}
                    {contenido.tipo === "TEXTO" && (
                      <MarkdownContent contenido={contenido.contenido} />
                    )}
                    {contenido.tipo === "DOCUMENTO" && (
                      <DocumentContentList documentos={contenido.documentosConUrl} />
                    )}
                  </CourseContentItem>
                ))}
              </ul>
            </section>

            <aside className="order-1 lg:sticky lg:top-6 lg:order-2">
              <CourseContentOutline
                tituloCurso={curso.titulo}
                progreso={progreso}
                vistos={idsVistos.size}
                total={contenidosVisibles.length}
                items={contenidosConDocumentos.map((contenido, index) => ({
                  id: contenido.id,
                  numero: index + 1,
                  titulo: contenido.titulo,
                  tipo: contenido.tipo,
                  visto: idsVistos.has(contenido.id),
                }))}
              />
            </aside>
          </div>
        )}
      </main>
    </AppShell>
  );
}
