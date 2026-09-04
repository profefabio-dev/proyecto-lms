import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Flame, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { obtenerEstadoEstudiante } from "@/lib/course-status";
import { calcularProgreso } from "@/lib/course-progress";
import { calcularRacha } from "@/lib/streak";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { CourseCard } from "@/components/course-card";

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
  // de detalle) y cuántos de esos ya vio el estudiante autenticado. Se
  // trae también el tutor de cada curso para mostrarlo en la tarjeta.
  //
  // Esta consulta y la de `ContentViews` de abajo no dependen una de la
  // otra (la de vistas solo necesita `usuarioActual.id`, no el resultado de
  // las inscripciones) — antes se esperaban en serie sin necesidad, así que
  // se paralelizan con `Promise.all` para no pagar dos viajes de ida y
  // vuelta a la base de datos uno detrás del otro (pase de optimización de
  // rendimiento, 2026-09-04).
  const [inscripciones, vistas] = await Promise.all([
    prisma.courseUsers.findMany({
      where: { userId: usuarioActual.id },
      include: {
        course: {
          include: {
            contenidos: { where: { visible: true }, select: { id: true } },
            tutor: { select: { nombre: true, apellido: true } },
          },
        },
      },
      orderBy: { fecha: "desc" },
    }),
    // Además del % de avance por curso, `vistoEn` alimenta la racha de
    // días activos. No se filtra por contenidos visibles porque la racha
    // debe reflejar toda la actividad real del estudiante, no solo la de
    // los cursos/contenidos que siguen visibles hoy.
    prisma.contentViews.findMany({
      where: { userId: usuarioActual.id },
      select: { contentId: true, vistoEn: true },
    }),
  ]);

  const idsVistos = new Set(vistas.map((vista) => vista.contentId));
  const racha = calcularRacha(vistas.map((vista) => vista.vistoEn));

  return (
    <AppShell usuario={usuarioActual} breadcrumbs={[{ label: "Mis cursos" }]}>
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Hola, {usuarioActual.nombre} 👋
            </h1>
            <p className="mt-1 text-muted-foreground">
              Este es el estado de tus cursos y tu actividad reciente.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {racha > 0 && (
              <div
                className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-br from-duo-orange to-duo-gold px-4 py-2.5 shadow-[0_3px_0_var(--duo-orange-shadow)]"
                title="Días consecutivos con actividad"
              >
                <Flame className="size-6 animate-flame-pulse text-white drop-shadow" aria-hidden="true" />
                <span className="text-base leading-none font-extrabold text-white">
                  {racha}
                  <span className="ml-1 text-xs font-semibold opacity-90">
                    {racha === 1 ? "día" : "días"} de racha
                  </span>
                </span>
              </div>
            )}
            <Link
              href="/estudiante/buscar"
              className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Search className="size-4" aria-hidden="true" />
              Buscar
            </Link>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Mis cursos</h2>

          {inscripciones.length === 0 ? (
            <EmptyState icon={BookOpen} message="Todavía no estás inscrito en ningún curso." />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {inscripciones.map((inscripcion, index) => {
                const estado = obtenerEstadoEstudiante(inscripcion.course.estado);
                const totalContenidos = inscripcion.course.contenidos.length;
                const contenidosVistos = inscripcion.course.contenidos.filter((contenido) =>
                  idsVistos.has(contenido.id)
                ).length;
                const progreso = calcularProgreso(contenidosVistos, totalContenidos);
                const completado = progreso === 100 && totalContenidos > 0;

                return (
                  <CourseCard
                    key={inscripcion.id}
                    href={`/estudiante/cursos/${inscripcion.course.id}`}
                    index={index}
                    titulo={inscripcion.course.titulo}
                    imagen={inscripcion.course.imagen}
                    tutor={inscripcion.course.tutor}
                    estadoLabel={estado.label}
                    progreso={progreso}
                    contenidosVistos={contenidosVistos}
                    totalContenidos={totalContenidos}
                    completado={completado}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
