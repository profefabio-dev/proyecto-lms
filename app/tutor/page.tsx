import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, GraduationCap, FileText, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";

export default async function TutorPage() {
  // Igual que en app/admin/page.tsx (US04): esta página tampoco tenía
  // guarda de sesión/rol antes de US18 — cualquier persona con sesión
  // activa podía entrar directamente a /tutor sin ser Tutor.
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

  // US18: métricas clave del Tutor (cursos, estudiantes, contenidos), sin
  // necesidad de navegar a otras pantallas. Se consultan en cada carga de
  // la página, así que siempre reflejan el estado actual de la base de
  // datos — mismo criterio ya usado en el dashboard del Admin (US04).
  const cursosDelTutor = await prisma.courses.findMany({
    where: { tutorId: usuarioActual.id },
    select: { id: true },
  });
  const idsCursos = cursosDelTutor.map((curso) => curso.id);

  const [inscripciones, totalContenidos] = await Promise.all([
    prisma.courseUsers.findMany({
      where: { courseId: { in: idsCursos } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.contents.count({ where: { courseId: { in: idsCursos } } }),
  ]);

  const indicadores: { etiqueta: string; valor: number; icon: LucideIcon }[] = [
    { etiqueta: "Mis cursos", valor: cursosDelTutor.length, icon: BookOpen },
    { etiqueta: "Estudiantes inscritos", valor: inscripciones.length, icon: GraduationCap },
    { etiqueta: "Contenidos publicados", valor: totalContenidos, icon: FileText },
  ];

  return (
    <AppShell usuario={usuarioActual}>
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Panel de Tutor</h1>

        <section
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          aria-label="Indicadores generales"
        >
          {indicadores.map((indicador) => {
            const Icono = indicador.icon;
            return (
              <Card key={indicador.etiqueta}>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Icono className="size-4 text-primary" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">{indicador.etiqueta}</p>
                  </div>
                  <p className="text-2xl font-bold">{indicador.valor}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/tutor/estudiantes" className="font-medium text-primary hover:underline">
            Gestionar estudiantes
          </Link>
          <Link href="/tutor/cursos" className="font-medium text-primary hover:underline">
            Gestionar cursos
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
