import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CreateCourseForm } from "@/components/create-course-form";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
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

  const VARIANTE_ESTADO_CURSO = {
    PUBLICADO: "success",
    BORRADOR: "warning",
    ARCHIVADO: "secondary",
  } as const;

  return (
    <>
      <SiteHeader usuario={usuarioActual} />
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Mis Cursos</h1>

        <CreateCourseForm />

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="py-2 pr-4 pl-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Título</th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Creado</th>
              </tr>
            </thead>
            <tbody>
              {cursos.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 pl-4 text-muted-foreground">
                    Aún no has creado ningún curso.
                  </td>
                </tr>
              )}
              {cursos.map((curso) => (
                <tr key={curso.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="py-2 pr-4 pl-4">
                     <Link href={`/tutor/cursos/${curso.id}`} className="font-medium text-primary hover:underline">
                        {curso.titulo}
                     </Link>
                  </td>
                  <td className="py-2 pr-4">
                    <Badge variant={VARIANTE_ESTADO_CURSO[curso.estado as keyof typeof VARIANTE_ESTADO_CURSO] ?? "secondary"}>
                      {curso.estado}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{curso.createdAt.toLocaleDateString("es-CO")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}