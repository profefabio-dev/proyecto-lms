import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookA } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { accesoAlCurso, esVistaPrevia } from "@/lib/course-preview";
import { ordenarTerminos, type TerminoDelGlosario } from "@/lib/glosario";
import { AppShell } from "@/components/app-shell";
import { PreviewBanner } from "@/components/preview-banner";
import { GlossaryList } from "@/components/glossary-list";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * US54 — el glosario del curso, del lado de quien estudia (27/11/2026).
 *
 * **Pantalla propia y no un bloque más del temario.** El temario ya es largo
 * —módulos, lecciones, actividades, evaluaciones y anuncios— y el glosario
 * no se lee de arriba abajo una vez: se consulta **mientras** se estudia,
 * muchas veces, desde la lección en la que apareció la palabra. Por eso tiene
 * URL propia, se enlaza desde el temario y desde el reproductor de lecciones,
 * y la lista vive en un solo lugar en vez de repetirse en dos pantallas.
 *
 * El control de acceso es el mismo del curso y se reutiliza de US42
 * (`accesoAlCurso`): estudiante inscrito, Tutor **dueño** del curso en vista
 * previa, o 404. Sin eso, conocer el id de un curso bastaría para leerle el
 * glosario a otro espacio.
 */
export default async function GlosarioPage({
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

  if (!usuarioActual) {
    redirect("/login");
  }

  const curso = await prisma.courses.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      titulo: true,
      tutorId: true,
      glosario: { select: { id: true, termino: true, definicion: true } },
    },
  });

  if (!curso) {
    notFound();
  }

  const inscripcion = await prisma.courseUsers.findFirst({
    where: { courseId: curso.id, userId: usuarioActual.id },
  });

  const acceso = accesoAlCurso({
    rol: usuarioActual.rol,
    usuarioId: usuarioActual.id,
    tutorIdDelCurso: curso.tutorId,
    tieneInscripcion: inscripcion !== null,
  });

  if (acceso.modo === "denegado") {
    notFound();
  }

  // El tipo va escrito y no inferido: en el clon de verificación el cliente
  // de Prisma no está generado y `select` devuelve `any`, que acabaría en
  // JSX — ver `AGENTS.md`.
  const terminos: TerminoDelGlosario[] = ordenarTerminos(curso.glosario);

  return (
    <AppShell
      usuario={usuarioActual}
      breadcrumbs={[
        { label: "Mis cursos", href: "/estudiante" },
        { label: curso.titulo, href: `/estudiante/cursos/${curso.id}` },
        { label: "Glosario" },
      ]}
    >
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {esVistaPrevia(acceso) && <PreviewBanner courseId={curso.id} />}

        <Link
          href={`/estudiante/cursos/${curso.id}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "min-h-11 gap-2 font-semibold"
          )}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al curso
        </Link>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookA className="size-4" aria-hidden="true" />
            </span>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Glosario
            </h1>
            {terminos.length > 0 && (
              <Badge variant="outline" className="text-xs font-semibold">
                {terminos.length} {terminos.length === 1 ? "término" : "términos"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Las palabras de {curso.titulo}, explicadas por tu profesor. Puedes volver acá cuando no
            recuerdes qué significa alguna.
          </p>
        </div>

        <GlossaryList terminos={terminos} />
      </main>
    </AppShell>
  );
}
