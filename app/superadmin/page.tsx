import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Flag, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import { filtroUsuarioVisibleEnEspacio } from "@/lib/espacio-scope";
import { CreateEspacioForm } from "@/components/create-espacio-form";
import { ToggleEspacioStatusForm } from "@/components/toggle-espacio-status-form";
import { ResetEspacioAdminPasswordForm } from "@/components/reset-espacio-admin-password-form";
import { AppShell } from "@/components/app-shell";
import { DataTable, Td, Th } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { etiquetaEstado } from "@/lib/etiquetas";
import { Badge } from "@/components/ui/badge";
import { ModerateCourseControls } from "@/components/moderate-course-controls";
import { MarkdownContent } from "@/components/markdown-content";

export default async function SuperAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== "SUPERADMIN") {
    redirect("/login");
  }

  // US25/US27: listado de todos los espacios existentes. `usuarios` acá
  // solo trae Administradores y Tutores (son los únicos roles con
  // `espacioId` propio — ver prisma/schema.prisma), ordenados por
  // antigüedad para poder tomar el primer Administrador como "principal".
  const espacios = await prisma.espacios.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      usuarios: { orderBy: { createdAt: "asc" } },
    },
  });

  // Cursos y Estudiantes no cuelgan directamente de Espacios en el modelo
  // (los cursos son de un Tutor, los Estudiantes se consideran "del
  // espacio" por inscripción — ver lib/espacio-scope.ts), así que se
  // consultan aparte por cada espacio.
  const espaciosConDetalle = await Promise.all(
    espacios.map(async (espacio) => {
      const administradorPrincipal =
        espacio.usuarios.find((usuario) => usuario.rol === Rol.ADMINISTRADOR) ?? null;
      const cantidadTutores = espacio.usuarios.filter(
        (usuario) => usuario.rol === Rol.TUTOR
      ).length;

      const [cantidadCursos, cantidadEstudiantes] = await Promise.all([
        prisma.courses.count({ where: { tutor: { espacioId: espacio.id } } }),
        prisma.users.count({ where: filtroUsuarioVisibleEnEspacio(espacio.id, Rol.ESTUDIANTE) }),
      ]);

      return { ...espacio, administradorPrincipal, cantidadTutores, cantidadCursos, cantidadEstudiantes };
    })
  );

  // US49 (28/11/2026): la cola de revisión del catálogo.
  //
  // Desde hoy el catálogo muestra **solo lo verificado**, así que marcar un
  // curso como compartible ya no lo publica: lo pone en esta cola. Si nadie
  // la mira, el docente comparte y no pasa nada — que es exactamente lo que
  // le pasó al botón de reportar antes de ayer.
  //
  // **El más viejo primero**: esto es una bandeja de pendientes, no un
  // listado de novedades, y lo que importa es quién lleva más tiempo
  // esperando. Se trae lo mismo que muestra la ficha del catálogo —título,
  // autor y cuánto material tiene— para poder decidir sin salir de acá, y
  // el enlace a la ficha para mirarlo completo antes de dar el sello.
  type CursoPorRevisar = {
    id: string;
    titulo: string;
    descripcion: string;
    verificado: boolean;
    compartible: boolean;
    createdAt: Date;
    tutor: { nombre: string; apellido: string };
    _count: { contenidos: number; actividades: number; quizzes: number };
  };

  const porRevisar: CursoPorRevisar[] = await prisma.courses.findMany({
    where: { compartible: true, verificado: false },
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      verificado: true,
      compartible: true,
      createdAt: true,
      tutor: { select: { nombre: true, apellido: true } },
      _count: { select: { contenidos: true, actividades: true, quizzes: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // US49 (27/11/2026): los cursos reportados por otros docentes.
  //
  // El botón de reportar se construyó el 26/11, pero **ninguna pantalla leía
  // la tabla**: los reportes se guardaban y nadie los veía nunca, con lo cual
  // la pieza de seguridad de US49 —"retirar en treinta segundos, no aprobar
  // lento"— no existía en la práctica. Esta sección es la otra mitad.
  //
  // Solo los cursos **que siguen en el catálogo**: un curso ya retirado no
  // necesita decisión, y dejarlo acá convertiría la lista en un historial en
  // vez de una bandeja de pendientes.
  type CursoReportado = {
    id: string;
    titulo: string;
    verificado: boolean;
    compartible: boolean;
    tutor: { nombre: string; apellido: string };
    reportes: {
      id: string;
      motivo: string;
      detalles: string | null;
      createdAt: Date;
      tutor: { nombre: string; apellido: string };
    }[];
  };

  const cursosReportados: CursoReportado[] = await prisma.courses.findMany({
    where: { compartible: true, reportes: { some: {} } },
    select: {
      id: true,
      titulo: true,
      verificado: true,
      compartible: true,
      tutor: { select: { nombre: true, apellido: true } },
      reportes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          motivo: true,
          detalles: true,
          createdAt: true,
          tutor: { select: { nombre: true, apellido: true } },
        },
      },
    },
  });

  return (
    <AppShell usuario={usuarioActual}>
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <PageHeader
          titulo="Espacios de docentes"
          descripcion="Cada espacio agrupa a un docente (o institución) con sus propios Administradores, Tutores y cursos, aislados del resto."
          icono={Building2}
          insignia={`${espaciosConDetalle.length} ${espaciosConDetalle.length === 1 ? "espacio" : "espacios"}`}
        />

        <CreateEspacioForm />

        <DataTable anchoMinimo="48rem">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40">
              <Th primera>Nombre</Th>
              <Th>Administrador</Th>
              <Th>Tutores</Th>
              <Th>Estudiantes</Th>
              <Th>Cursos</Th>
              <Th>Estado</Th>
              <Th ultima>Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {espaciosConDetalle.length === 0 && (
              <tr>
                <Td colSpan={7} className="py-8 text-center text-muted-foreground">
                  No hay espacios registrados todavía.
                </Td>
              </tr>
            )}
            {espaciosConDetalle.map((espacio) => (
              <tr key={espacio.id} className="transition-colors hover:bg-muted/30">
                <Td primera className="min-w-[10rem] font-medium text-foreground">
                  {espacio.nombre}
                </Td>
                <Td>
                  {espacio.administradorPrincipal ? (
                    `${espacio.administradorPrincipal.nombre} ${espacio.administradorPrincipal.apellido}`
                  ) : (
                    <span className="text-muted-foreground">Sin administrador</span>
                  )}
                </Td>
                <Td>{espacio.cantidadTutores}</Td>
                <Td>{espacio.cantidadEstudiantes}</Td>
                <Td>{espacio.cantidadCursos}</Td>
                <Td>
                  <Badge
                    variant={espacio.estado === "ACTIVO" ? "success" : "secondary"}
                    className="text-xs font-semibold"
                  >
                    {etiquetaEstado(espacio.estado)}
                  </Badge>
                </Td>
                <Td ultima>
                  <div className="flex flex-col items-start gap-2">
                    <ToggleEspacioStatusForm espacioId={espacio.id} estadoActual={espacio.estado} />
                    {espacio.administradorPrincipal && (
                      <ResetEspacioAdminPasswordForm
                        administradorId={espacio.administradorPrincipal.id}
                      />
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>

        {/* POR REVISAR — US49 (28/11/2026). Desde hoy nada entra al catálogo
            sin pasar por acá: el catálogo es el producto, y lo que circula
            con el sello lleva el nombre de la plataforma. */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Inbox className="size-5 text-primary" aria-hidden="true" />
            <h2 className="font-heading text-xl font-bold text-foreground">
              Cursos por revisar
            </h2>
            {porRevisar.length > 0 && (
              <Badge variant="warning" className="text-xs font-semibold">
                {porRevisar.length}
              </Badge>
            )}
          </div>

          {porRevisar.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
              Ningún curso espera revisión. Cuando un docente comparta uno, aparece acá antes de
              entrar al catálogo.
            </p>
          ) : (
            <ul className="space-y-4">
              {porRevisar.map((curso) => (
                <li
                  key={curso.id}
                  className="space-y-3 rounded-2xl border border-border/80 bg-card p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/tutor/catalogo/${curso.id}`}
                        className="font-heading text-base font-bold text-foreground hover:text-primary hover:underline"
                      >
                        {curso.titulo}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        De {curso.tutor.nombre} {curso.tutor.apellido} · esperando desde el{" "}
                        {curso.createdAt.toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                      <p className="max-w-[70ch] text-sm text-muted-foreground">
                        {curso.descripcion}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {curso._count.contenidos} lecciones · {curso._count.actividades} actividades
                        · {curso._count.quizzes} evaluaciones
                      </p>
                    </div>

                    {/* Los mismos dos controles de siempre: dar el sello
                        —que acá es lo que publica— o retirarlo del
                        catálogo, que devuelve el curso a su autor. */}
                    <ModerateCourseControls
                      courseId={curso.id}
                      verificado={curso.verificado}
                      compartible={curso.compartible}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* CURSOS REPORTADOS — US49 (27/11/2026). La plataforma es para
            menores de edad: un curso con contenido inapropiado tiene que
            poder retirarse a cualquier hora, y para eso hay que verlo. */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Flag className="size-5 text-destructive" aria-hidden="true" />
            <h2 className="font-heading text-xl font-bold text-foreground">Cursos reportados</h2>
            {cursosReportados.length > 0 && (
              <Badge variant="destructive" className="text-xs font-semibold">
                {cursosReportados.length}
              </Badge>
            )}
          </div>

          {cursosReportados.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
              Ningún docente ha reportado un curso del catálogo.
            </p>
          ) : (
            <ul className="space-y-4">
              {cursosReportados.map((curso) => (
                <li
                  key={curso.id}
                  className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-heading text-base font-bold text-foreground">
                        {curso.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        De {curso.tutor.nombre} {curso.tutor.apellido} ·{" "}
                        <span className="font-semibold text-destructive">
                          {curso.reportes.length}{" "}
                          {curso.reportes.length === 1 ? "reporte" : "reportes"}
                        </span>
                      </p>
                    </div>

                    {/* Las dos acciones que ya existían (US49): quitar el
                        sello o retirarlo del catálogo. */}
                    <ModerateCourseControls
                      courseId={curso.id}
                      verificado={curso.verificado}
                      compartible={curso.compartible}
                    />
                  </div>

                  <ul className="space-y-2">
                    {curso.reportes.map((reporte) => (
                      <li
                        key={reporte.id}
                        className="space-y-1 rounded-2xl border border-border/60 bg-card p-3"
                      >
                        <p className="text-xs font-semibold text-foreground">
                          {reporte.motivo}
                          <span className="ml-2 font-normal text-muted-foreground">
                            {reporte.tutor.nombre} {reporte.tutor.apellido} ·{" "}
                            {reporte.createdAt.toLocaleDateString("es-CO", {
                              day: "numeric",
                              month: "long",
                            })}
                          </span>
                        </p>
                        {reporte.detalles && <MarkdownContent contenido={reporte.detalles} />}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
