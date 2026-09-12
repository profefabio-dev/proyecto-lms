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
import { agruparContenidoPorSeccion, contenidoSinSeccion } from "@/lib/group-content-by-section";
import { Badge } from "@/components/ui/badge";

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
      // US30: secciones plegables del curso, con su estado (fijado a mano
      // por el Tutor) y la marca opcional de "semana actual".
      secciones: {
        orderBy: { orden: "asc" },
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

  // US30: el mapa de estado por sección decide, además de `visible`, si un
  // contenido cuenta como accesible — el contenido de una sección "No
  // disponible" queda tan oculto para el Estudiante como uno con
  // `visible: false` (ni aparece en la lista, ni cuenta para el avance),
  // hasta que el Tutor la marque Disponible. El contenido sin sección nunca
  // se ve afectado por esto.
  const estadoPorSeccion = new Map(curso.secciones.map((seccion) => [seccion.id, seccion.estado]));
  const contenidosVisibles = curso.contenidos.filter((contenido) => {
    if (!contenido.visible) {
      return false;
    }

    if (contenido.seccionId && estadoPorSeccion.get(contenido.seccionId) === "NO_DISPONIBLE") {
      return false;
    }

    return true;
  });

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

  // US30: agrupa el contenido accesible por sección para mostrarlo en
  // bloques plegables; el contenido sin sección sigue igual que siempre, en
  // la lista plana de abajo. Las secciones "No disponible" se muestran
  // igual (título + insignia de estado), pero sin su contenido — ya se
  // excluyó de `contenidosVisibles` más arriba.
  const gruposDeSeccion = agruparContenidoPorSeccion(contenidosConDocumentos, [...curso.secciones]);
  const contenidoSueltoEstudiante = contenidoSinSeccion(contenidosConDocumentos);
  // El número de cada contenido (usado tanto en su tarjeta como en el
  // índice de la barra lateral) refleja su posición en la lista completa,
  // no la posición dentro de su sección — así el índice de navegación y las
  // tarjetas siempre numeran igual, se muestren agrupadas o no.
  const numeroPorContenido = new Map(
    contenidosConDocumentos.map((contenido, index) => [contenido.id, index + 1])
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

        {contenidosConDocumentos.length === 0 && curso.secciones.length === 0 ? (
          <EmptyState icon={Inbox} message="Este curso todavía no tiene contenido publicado." />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <section className="order-2 space-y-6 lg:order-1">
              <h2 className="text-xl font-semibold">Contenido del curso</h2>

              {/* US30: cada sección es un bloque plegable, con un
                  indicador claro de estado (Disponible/No disponible/Semana
                  actual) — solo la "semana actual" viene abierta por
                  defecto, para que el Estudiante no tenga que desplazarse
                  entre secciones que todavía no le tocan (el pedido
                  original: "ubicar el material que necesito sin perderme
                  entre espacios vacíos"). El contenido sin sección sigue
                  igual que siempre: siempre visible, sin agrupar. */}
              {gruposDeSeccion.map(({ seccion, contenidos }) => (
                <details key={seccion.id} open={seccion.esActual} className="space-y-4">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-lg font-semibold">
                    {seccion.titulo}
                    {seccion.esActual && <Badge variant="success">Semana actual</Badge>}
                    {seccion.estado === "NO_DISPONIBLE" && (
                      <Badge variant="secondary">No disponible</Badge>
                    )}
                  </summary>

                  {seccion.estado === "NO_DISPONIBLE" ? (
                    <p className="text-sm text-muted-foreground">
                      Todavía no está disponible — tu tutor la habilitará más adelante.
                    </p>
                  ) : contenidos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Esta sección todavía no tiene contenido.
                    </p>
                  ) : (
                    <ul className="space-y-10">
                      {contenidos.map((contenido, index) => (
                        <CourseContentItem
                          key={contenido.id}
                          numero={numeroPorContenido.get(contenido.id) ?? index + 1}
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
                  )}
                </details>
              ))}

              {contenidoSueltoEstudiante.length > 0 && (
                <ul className="space-y-10">
                  {contenidoSueltoEstudiante.map((contenido, index) => (
                    <CourseContentItem
                      key={contenido.id}
                      numero={numeroPorContenido.get(contenido.id) ?? index + 1}
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
              )}
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
