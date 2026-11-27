import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Download,
  Inbox,
  Lock,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { MarkdownContent } from "@/components/markdown-content";
import { GradeSubmissionForm } from "@/components/grade-submission-form";
import { Badge } from "@/components/ui/badge";
import { crearUrlDescarga } from "@/lib/supabase/storage";
import { estadoDeLaEntrega } from "@/lib/activity-submission";
import { EditActivityWindowForm } from "@/components/edit-activity-window-form";

// Pantalla de revisión de una actividad (19/11/2026): el tutor ve quién
// entregó, qué entregó, y califica ahí mismo. También lista a los
// estudiantes que no han entregado, que es la mitad de la información que
// un docente necesita y que no se ve si solo se listan las entregas.
export default async function RevisarActividadPage({
  params,
}: {
  params: Promise<{ courseId: string; actividadId: string }>;
}) {
  const { courseId, actividadId } = await params;

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

  const actividad = await prisma.actividades.findUnique({
    where: { id: actividadId },
    include: {
      course: true,
      entregas: {
        include: { user: true },
        orderBy: { entregadaEn: "desc" },
      },
    },
  });

  if (!actividad || actividad.courseId !== courseId) {
    notFound();
  }

  // El curso debe ser del tutor autenticado: sin esto, cualquier tutor
  // podría revisar las entregas de un curso ajeno adivinando el id.
  if (actividad.course.tutorId !== usuarioActual.id) {
    notFound();
  }

  const inscritos = await prisma.courseUsers.findMany({
    where: { courseId },
    include: { user: true },
  });

  const idsConEntrega = new Set(actividad.entregas.map((entrega) => entrega.userId));
  const sinEntregar = inscritos.filter((inscripcion) => !idsConEntrega.has(inscripcion.userId));
  const calificadas = actividad.entregas.filter((entrega) => entrega.nota !== null).length;

  // Las URLs de descarga son firmadas y de corta duración, así que se
  // generan en cada carga de la página (mismo criterio que en US09/US16).
  const entregasConArchivo = await Promise.all(
    actividad.entregas.map(async (entrega) => ({
      ...entrega,
      urlArchivo: entrega.archivo ? await crearUrlDescarga(entrega.archivo, 300) : null,
    }))
  );

  const formatoFecha = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // US52 (26/11/2026): el estado de la ventana de entrega se veía solo del
  // lado del estudiante. El tutor califica sin saber si la actividad sigue
  // aceptando trabajos, que es justo lo que decide si tiene sentido esperar
  // a alguien o ya puede cerrar la nota.
  const estadoVentana = estadoDeLaEntrega(
    { fechaLimite: actividad.fechaLimite, fechaCierre: actividad.fechaCierre },
    new Date()
  );

  const textoVentana = {
    abierta: "Abierta",
    fuera_de_plazo: "Fuera de plazo (sigue aceptando)",
    cerrada: "Cerrada: ya no acepta entregas",
  }[estadoVentana];

  return (
    <AppShell
      usuario={usuarioActual}
      breadcrumbs={[
        { label: "Mis cursos", href: "/tutor/cursos" },
        { label: actividad.course.titulo, href: `/tutor/cursos/${courseId}` },
        { label: actividad.titulo },
      ]}
    >
      <main className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6 py-8">
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

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
                {actividad.titulo}
              </h1>
              {actividad.descripcion && (
                <p className="text-sm text-muted-foreground">{actividad.descripcion}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold">
                <ClipboardList className="mr-1 size-3 text-primary" aria-hidden="true" />
                {actividad.puntajeMaximo} puntos
              </Badge>
              {actividad.fechaLimite && (
                <Badge variant="outline" className="text-xs font-semibold">
                  <CalendarClock className="mr-1 size-3 text-primary" aria-hidden="true" />
                  Vence {formatoFecha.format(actividad.fechaLimite)}
                </Badge>
              )}
              {actividad.fechaCierre && (
                <Badge variant="outline" className="text-xs font-semibold">
                  <Lock className="mr-1 size-3 text-primary" aria-hidden="true" />
                  Cierra {formatoFecha.format(actividad.fechaCierre)}
                </Badge>
              )}
              <Badge
                variant={
                  estadoVentana === "cerrada"
                    ? "destructive"
                    : estadoVentana === "fuera_de_plazo"
                      ? "warning"
                      : "success"
                }
                className="text-xs font-semibold"
              >
                {textoVentana}
              </Badge>
            </div>
          </div>
        </div>

        <section className="space-y-3 rounded-2xl border border-border/80 bg-card p-5">
          <h2 className="font-heading text-lg font-bold text-foreground">Instrucciones</h2>
          <MarkdownContent contenido={actividad.instrucciones} />
        </section>

        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="text-xs font-semibold">
            <Inbox className="mr-1 size-3 text-primary" aria-hidden="true" />
            {actividad.entregas.length} de {inscritos.length} entregaron
          </Badge>
          <Badge variant="outline" className="text-xs font-semibold">
            {calificadas} calificadas
          </Badge>
        </div>

        <EditActivityWindowForm
          actividadId={actividad.id}
          fechaLimite={actividad.fechaLimite}
          fechaCierre={actividad.fechaCierre}
        />

        <section className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground">Entregas</h2>

          {entregasConArchivo.length === 0 ? (
            <EmptyState icon={Inbox} message="Todavía nadie ha entregado esta actividad." />
          ) : (
            <ul className="space-y-4">
              {entregasConArchivo.map((entrega) => (
                <li
                  key={entrega.id}
                  className="space-y-4 rounded-2xl border border-border/80 bg-card p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-base font-bold text-foreground">
                        {entrega.user.nombre} {entrega.user.apellido}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Entregó el {formatoFecha.format(entrega.entregadaEn)}
                        {actividad.fechaLimite && entrega.entregadaEn > actividad.fechaLimite
                          ? " · fuera de plazo"
                          : ""}
                      </p>
                    </div>

                    <Badge
                      variant={entrega.nota === null ? "warning" : "success"}
                      className="font-semibold"
                    >
                      {entrega.nota === null
                        ? "Sin calificar"
                        : `${entrega.nota} / ${actividad.puntajeMaximo}`}
                    </Badge>
                  </div>

                  {entrega.texto && (
                    <div className="rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 text-sm whitespace-pre-wrap text-foreground">
                      {entrega.texto}
                    </div>
                  )}

                  {entrega.archivo &&
                    (entrega.urlArchivo ? (
                      <a
                        href={entrega.urlArchivo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4"
                      >
                        <Download className="size-4" aria-hidden="true" />
                        {entrega.nombreArchivo ?? "Archivo adjunto"}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {entrega.nombreArchivo ?? "Archivo adjunto"} (no se pudo generar el enlace)
                      </p>
                    ))}

                  <div className="border-t border-border/60 pt-4">
                    <GradeSubmissionForm
                      entregaId={entrega.id}
                      puntajeMaximo={actividad.puntajeMaximo}
                      notaPrevia={entrega.nota}
                      retroalimentacionPrevia={entrega.retroalimentacion}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {sinEntregar.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-muted-foreground" aria-hidden="true" />
              <h2 className="font-heading text-xl font-bold text-foreground">
                Sin entregar ({sinEntregar.length})
              </h2>
            </div>
            <ul className="flex flex-wrap gap-2">
              {sinEntregar.map((inscripcion) => (
                <li key={inscripcion.id}>
                  <Badge variant="secondary" className="font-medium">
                    {inscripcion.user.nombre} {inscripcion.user.apellido}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </AppShell>
  );
}
