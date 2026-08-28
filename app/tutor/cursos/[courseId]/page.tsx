import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AssignStudentsForm } from "@/components/assign-students-form";
import { CreateVideoContentForm } from "@/components/create-video-content-form";
import { YoutubeEmbed } from "@/components/youtube-embed";

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

        {curso.contenidos.length === 0 ? (
          <p className="text-gray-500">Este curso todavía no tiene contenido publicado.</p>
        ) : (
          <ul className="space-y-6">
            {curso.contenidos.map((contenido) => (
              <li key={contenido.id} className="space-y-2">
                <h3 className="font-medium">{contenido.titulo}</h3>
                {contenido.descripcion && (
                  <p className="text-sm text-gray-600">{contenido.descripcion}</p>
                )}
                {contenido.tipo === "VIDEO" && (
                  <YoutubeEmbed url={contenido.contenido} titulo={contenido.titulo} />
                )}
              </li>
            ))}
          </ul>
        )}

        <div>
          <h3 className="mb-2 text-lg font-semibold">Publicar video</h3>
          <CreateVideoContentForm courseId={curso.id} />
        </div>
      </section>
    </main>
  );
}