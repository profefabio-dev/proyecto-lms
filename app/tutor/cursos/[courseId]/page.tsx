import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AssignStudentsForm } from "@/components/assign-students-form";
import { CreateVideoContentForm } from "@/components/create-video-content-form";
import { UploadDocumentForm } from "@/components/upload-document-form";
import { CreateTextContentForm } from "@/components/create-text-content-form";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { MarkdownContent } from "@/components/markdown-content";
import { DocumentContentList } from "@/components/document-content-list";
import { ContentOrderControls } from "@/components/content-order-controls";
import { crearUrlDescarga } from "@/lib/supabase/storage";

export default async function CursoDetallePage({
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

  if (!usuarioActual || usuarioActual.rol !== "TUTOR") {
    redirect("/login");
  }

  const curso = await prisma.courses.findUnique({
    where: { id: courseId },
    include: {
      inscritos: {
        include: { user: true },
      },
      contenidos: {
        orderBy: { orden: "asc" },
        include: { documentos: true },
      },
    },
  });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    notFound();
  }

  const idsInscritos = curso.inscritos.map((inscripcion) => inscripcion.userId);

  const estudiantesDisponibles = await prisma.users.findMany({
    where: {
      rol: "ESTUDIANTE",
      id: idsInscritos.length > 0 ? { notIn: idsInscritos } : undefined,
    },
    orderBy: { nombre: "asc" },
  });

  // Las URLs de descarga son firmadas y de corta duración (US09/US16), así
  // que se generan en cada carga de la página en vez de guardarse.
  const contenidosConDocumentos = await Promise.all(
    curso.contenidos.map(async (contenido) => {
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

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Estudiantes inscritos</h2>
        {curso.inscritos.length === 0 ? (
          <p className="text-gray-500">Aún no hay estudiantes inscritos en este curso.</p>
        ) : (
          <ul className="list-disc list-inside space-y-1">
            {curso.inscritos.map((inscripcion) => (
              <li key={inscripcion.id}>
                {inscripcion.user.nombre} {inscripcion.user.apellido} — {inscripcion.user.email}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Asignar estudiantes</h2>
        <AssignStudentsForm courseId={curso.id} estudiantes={estudiantesDisponibles} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Contenido del curso</h2>

        {contenidosConDocumentos.length === 0 ? (
          <p className="text-gray-500">Este curso todavía no tiene contenido publicado.</p>
        ) : (
          <ul className="space-y-6">
            {contenidosConDocumentos.map((contenido, indice) => (
              <li
                key={contenido.id}
                className={`space-y-2 ${!contenido.visible ? "opacity-60" : ""}`}
              >
                <ContentOrderControls
                  contentId={contenido.id}
                  esPrimero={indice === 0}
                  esUltimo={indice === contenidosConDocumentos.length - 1}
                  visible={contenido.visible}
                />
                <h3 className="font-medium">{contenido.titulo}</h3>
                {contenido.descripcion && (
                  <p className="text-sm text-gray-600">{contenido.descripcion}</p>
                )}
                {contenido.tipo === "VIDEO" && (
                  <YoutubeEmbed url={contenido.contenido} titulo={contenido.titulo} />
                )}
                {contenido.tipo === "TEXTO" && (
                  <MarkdownContent contenido={contenido.contenido} />
                )}
                {contenido.tipo === "DOCUMENTO" && (
                  <DocumentContentList documentos={contenido.documentosConUrl} />
                )}
              </li>
            ))}
          </ul>
        )}

        <div>
          <h3 className="mb-2 text-lg font-semibold">Publicar video</h3>
          <CreateVideoContentForm courseId={curso.id} />
        </div>

        <div>
          <h3 className="mb-2 text-lg font-semibold">Subir documento</h3>
          <UploadDocumentForm courseId={curso.id} />
        </div>

        <div>
          <h3 className="mb-2 text-lg font-semibold">Publicar contenido de texto</h3>
          <CreateTextContentForm courseId={curso.id} />
        </div>
      </section>
    </main>
  );
}
