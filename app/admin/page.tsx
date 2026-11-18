import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  FileText,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Rol } from "@prisma/client";

export default async function AdminPage() {
  // Igual que en app/admin/usuarios/page.tsx y app/tutor/*: verificar sesión
  // y luego el rol contra la tabla Users. Esta página no tenía guarda antes
  // de US04 — se agrega aquí junto con los indicadores.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== "ADMINISTRADOR") {
    redirect("/login");
  }

  // Épica Multi-docente (US24): los indicadores de este panel solo cuentan
  // lo que pertenece al espacio del Administrador — antes de esto mostraban
  // el total de toda la plataforma, lo cual habría filtrado datos de otros
  // docentes en cuanto exista un segundo espacio (US25). Caso defensivo:
  // todo Administrador existente quedó con espacioId asignado por la
  // migración de la épica.
  if (!usuarioActual.espacioId) {
    redirect("/login");
  }
  const espacioId = usuarioActual.espacioId;

  // Se consulta en cada carga de la página (Server Component sin caché), así
  // que los indicadores siempre reflejan el estado actual de la base de
  // datos — no hay un valor guardado que se pueda quedar desactualizado.
  // Los Estudiantes no tienen espacioId propio (cuenta compartida entre
  // espacios): se cuentan por inscripción distinta en un curso del espacio,
  // mismo criterio que ya usa el panel de Tutor para "Estudiantes inscritos".
  const [administradores, tutores, estudiantesInscritos, cursosActivos, totalContenidos] =
    await Promise.all([
      prisma.users.count({ where: { rol: Rol.ADMINISTRADOR, espacioId } }),
      prisma.users.count({ where: { rol: Rol.TUTOR, espacioId } }),
      prisma.courseUsers.findMany({
        where: { course: { tutor: { espacioId } } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.courses.count({ where: { estado: "PUBLICADO", tutor: { espacioId } } }),
      prisma.contents.count({ where: { course: { tutor: { espacioId } } } }),
    ]);

  const indicadores: {
    etiqueta: string;
    valor: number;
    icon: LucideIcon;
    tono: string;
  }[] = [
    { etiqueta: "Administradores", valor: administradores, icon: ShieldCheck, tono: "bg-primary/10 text-primary" },
    { etiqueta: "Tutores", valor: tutores, icon: UserCog, tono: "bg-duo-blue/10 text-duo-blue" },
    { etiqueta: "Estudiantes", valor: estudiantesInscritos.length, icon: GraduationCap, tono: "bg-success-soft text-success" },
    { etiqueta: "Cursos activos", valor: cursosActivos, icon: BookOpen, tono: "bg-primary/10 text-primary" },
    { etiqueta: "Contenidos totales", valor: totalContenidos, icon: FileText, tono: "bg-duo-blue/10 text-duo-blue" },
  ];

  return (
    <AppShell usuario={usuarioActual}>
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        {/* Banner de bienvenida (mismo estilo que el panel del Tutor) */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-duo-blue/10 p-6 shadow-xs sm:p-8">
          <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider">
                Administrador
              </Badge>
              <span className="flex items-center gap-1 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" aria-hidden="true" /> Gestión de tu espacio
              </span>
            </div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Panel de Administrador
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Hola, {usuarioActual.nombre}. Desde aquí supervisas a los tutores y a los usuarios de
              tu espacio y consultas el estado general de los cursos.
            </p>
          </div>
        </div>

        <section aria-label="Indicadores generales" className="space-y-3">
          <h2 className="font-heading text-lg font-bold text-foreground">Resumen de tu espacio</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {indicadores.map((indicador) => {
              const Icono = indicador.icon;
              return (
                <Card key={indicador.etiqueta} className="rounded-2xl border border-border/80 py-0 shadow-xs">
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-xl",
                        indicador.tono
                      )}
                    >
                      <Icono className="size-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{indicador.etiqueta}</p>
                      <p className="font-heading text-2xl font-extrabold text-foreground">
                        {indicador.valor}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-lg font-bold text-foreground">Herramientas del Administrador</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UserCog className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-heading text-lg font-bold text-foreground">Gestión de Tutores</h3>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Crea cuentas de tutor, edita sus datos y restablece su contraseña cuando la olviden.
                </p>
              </div>
              <Link
                href="/admin/tutores"
                className={cn(buttonVariants({ variant: "default" }), "min-h-11 justify-between font-semibold")}
              >
                <span>Administrar tutores</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-success-soft text-success">
                    <Users className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-heading text-lg font-bold text-foreground">Usuarios del sistema</h3>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Consulta a todos los administradores, tutores y estudiantes de tu espacio, y
                  desactiva o reactiva cuentas sin borrar su historial.
                </p>
              </div>
              <Link
                href="/admin/usuarios"
                className={cn(buttonVariants({ variant: "outline" }), "min-h-11 justify-between font-semibold")}
              >
                <span>Ver todos los usuarios</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
