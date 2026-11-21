import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, ClipboardList, TrendingUp, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { DataTable, Th, Td } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Panel de seguimiento del curso (19/11/2026): una fila por estudiante
// inscrito, con cuánto contenido ha visto, cuántas actividades entregó y su
// promedio. Hasta ahora esa información existía pero estaba repartida —
// las vistas en cada contenido, las entregas dentro de cada actividad — y
// no había ninguna pantalla que respondiera "¿cómo va cada estudiante?",
// que es la pregunta que un docente se hace primero.
export default async function SeguimientoPage({
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
      // Solo lo que el estudiante puede ver cuenta para su avance: incluir
      // contenido oculto haría que nadie llegara nunca al 100 %.
      contenidos: {
        where: { visible: true },
        select: { id: true },
      },
      actividades: {
        where: { visible: true },
        select: { id: true, puntajeMaximo: true },
      },
    },
  });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    notFound();
  }

  const idsContenidos = curso.contenidos.map((contenido) => contenido.id);
  const idsActividades = curso.actividades.map((actividad) => actividad.id);

  // Dos consultas para todo el curso, en vez de una por estudiante: el
  // cruce se arma en memoria, que a esta escala (un curso escolar) es
  // mucho más barato que ir a la base por cada fila.
  const vistas = idsContenidos.length
    ? await prisma.contentViews.findMany({
        where: { contentId: { in: idsContenidos } },
        select: { userId: true },
      })
    : [];

  const entregas = idsActividades.length
    ? await prisma.entregas.findMany({
        where: { actividadId: { in: idsActividades } },
        select: { userId: true, nota: true, actividadId: true },
      })
    : [];

  // El tipo se fija a mano: sin él, TypeScript infiere `Map<unknown,
  // unknown>` y `.get()` deja de servir para operar aritméticamente.
  const puntajePorActividad = new Map<string, number>(
    curso.actividades.map((actividad) => [actividad.id, actividad.puntajeMaximo])
  );

  const filas = curso.inscritos
    .map((inscripcion) => {
      const vistasDelEstudiante = vistas.filter(
        (vista) => vista.userId === inscripcion.userId
      ).length;

      const entregasDelEstudiante = entregas.filter(
        (entrega) => entrega.userId === inscripcion.userId
      );

      const calificadas = entregasDelEstudiante.filter((entrega) => entrega.nota !== null);

      // El promedio se calcula en porcentaje sobre el puntaje máximo de
      // cada actividad, porque no todas valen lo mismo: promediar las notas
      // en bruto mezclaría una sobre 5 con una sobre 100.
      const promedio = calificadas.length
        ? calificadas.reduce((suma, entrega) => {
            const maximo = puntajePorActividad.get(entrega.actividadId) ?? 100;
            return suma + ((entrega.nota ?? 0) / maximo) * 100;
          }, 0) / calificadas.length
        : null;

      const avance = idsContenidos.length
        ? Math.round((vistasDelEstudiante / idsContenidos.length) * 100)
        : 0;

      return {
        id: inscripcion.id,
        nombre: `${inscripcion.user.nombre} ${inscripcion.user.apellido}`,
        grado: inscripcion.user.grado,
        vistas: vistasDelEstudiante,
        avance,
        entregadas: entregasDelEstudiante.length,
        calificadas: calificadas.length,
        promedio,
      };
    })
    // Primero quien va más atrasado: es a quien el docente necesita ver.
    .sort((a, b) => a.avance - b.avance || a.nombre.localeCompare(b.nombre, "es"));

  const promedioCurso = (() => {
    const conPromedio = filas.filter((fila) => fila.promedio !== null);
    if (!conPromedio.length) return null;
    return (
      conPromedio.reduce((suma, fila) => suma + (fila.promedio ?? 0), 0) / conPromedio.length
    );
  })();

  return (
    <AppShell
      usuario={usuarioActual}
      breadcrumbs={[
        { label: "Mis cursos", href: "/tutor/cursos" },
        { label: curso.titulo, href: `/tutor/cursos/${courseId}` },
        { label: "Seguimiento" },
      ]}
    >
      <main className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6 py-8">
        <div className="space-y-3">
          <Link
            href={`/tutor/cursos/${courseId}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "min-h-11 gap-2 font-semibold"
            )}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver al curso
          </Link>

          <PageHeader
            titulo="Seguimiento del curso"
            descripcion={`Cómo va cada estudiante de ${curso.titulo}.`}
            icono={TrendingUp}
            insignia={`${curso.inscritos.length} ${curso.inscritos.length === 1 ? "estudiante" : "estudiantes"}`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1 rounded-2xl border border-border/80 bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="size-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wide">Lecciones</span>
            </div>
            <p className="font-heading text-2xl font-bold text-foreground">
              {curso.contenidos.length}
            </p>
          </div>

          <div className="space-y-1 rounded-2xl border border-border/80 bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="size-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wide">Actividades</span>
            </div>
            <p className="font-heading text-2xl font-bold text-foreground">
              {curso.actividades.length}
            </p>
          </div>

          <div className="space-y-1 rounded-2xl border border-border/80 bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="size-4" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Promedio del curso
              </span>
            </div>
            <p className="font-heading text-2xl font-bold text-foreground">
              {promedioCurso === null ? "—" : `${promedioCurso.toFixed(0)}%`}
            </p>
          </div>
        </div>

        {filas.length === 0 ? (
          <EmptyState icon={Users} message="Este curso todavía no tiene estudiantes inscritos." />
        ) : (
          <DataTable anchoMinimo="44rem">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <Th primera>Estudiante</Th>
                <Th>Avance en lecciones</Th>
                <Th>Actividades</Th>
                <Th ultima>Promedio</Th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.id} className="border-b border-border/40 last:border-0">
                  <Td primera>
                    <span className="font-medium text-foreground">{fila.nombre}</span>
                    {fila.grado && (
                      <span className="ml-2 text-xs text-muted-foreground">{fila.grado}</span>
                    )}
                  </Td>

                  <Td>
                    <div className="flex items-center gap-3">
                      <Progress value={fila.avance} className="w-28" />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {fila.vistas}/{curso.contenidos.length}
                      </span>
                    </div>
                  </Td>

                  <Td>
                    <span className="tabular-nums text-foreground">
                      {fila.entregadas}/{curso.actividades.length}
                    </span>
                    {fila.entregadas > fila.calificadas && (
                      <Badge variant="warning" className="ml-2 font-semibold">
                        {fila.entregadas - fila.calificadas} por calificar
                      </Badge>
                    )}
                  </Td>

                  <Td ultima>
                    {fila.promedio === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Badge
                        variant={fila.promedio >= 60 ? "success" : "destructive"}
                        className="font-semibold tabular-nums"
                      >
                        {fila.promedio.toFixed(0)}%
                      </Badge>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </main>
    </AppShell>
  );
}
