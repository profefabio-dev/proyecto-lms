import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Code2,
  Cpu,
  Flame,
  Award,
  Laptop,
  Layers,
  ChevronRight,
  Users,
  Compass,
  FileCheck2,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Cursos de muestra si la base de datos aún no tiene cursos publicados
const CURSOS_DESTACADOS_DEFAULT = [
  {
    id: "demo-1",
    titulo: "Pensamiento Computacional y Algoritmos",
    descripcion:
      "Desarrolla la lógica de programación mediante resolución de problemas, diagramas de flujo y estructuras básicas de código.",
    tag: "Fundamentos",
    nivel: "Iniciación",
    modulos: "8 Módulos",
    gradient: "from-blue-600 to-indigo-600",
  },
  {
    id: "demo-2",
    titulo: "Desarrollo Web Moderno con React y Next.js",
    descripcion:
      "Aprende a construir aplicaciones web completas, diseño responsivo, componentes interactivos y despliegue en la nube.",
    tag: "Desarrollo Web",
    nivel: "Intermedio",
    modulos: "12 Módulos",
    gradient: "from-indigo-600 to-violet-600",
  },
  {
    id: "demo-3",
    titulo: "Bases de Datos y Gestión de la Información",
    descripcion:
      "Diseña esquemas relacionales, consultas SQL optimizadas y conexión segura con aplicaciones y servicios modernos.",
    tag: "Datos & Backend",
    nivel: "Intermedio",
    modulos: "6 Módulos",
    gradient: "from-violet-600 to-purple-600",
  },
  {
    id: "demo-4",
    titulo: "Robótica Educativa, IoT y Automatización",
    descripcion:
      "Proyectos prácticos integrando sensores, actuadores y microcontroladores para solucionar retos del mundo real.",
    tag: "Tecnología & Hardware",
    nivel: "Práctico",
    modulos: "10 Módulos",
    gradient: "from-sky-600 to-blue-700",
  },
];

export default async function Home() {
  // Verificamos si el usuario ya cuenta con sesión activa
  let usuarioAutenticado = null;
  let cursosPublicados: Array<{
    id: string;
    titulo: string;
    descripcion: string;
    tutorNombre?: string;
    totalContenidos?: number;
  }> = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      usuarioAutenticado = user;
    }

    const cursosDb = await prisma.courses.findMany({
      where: { estado: "PUBLICADO" },
      include: {
        tutor: { select: { nombre: true, apellido: true } },
        contenidos: { where: { visible: true }, select: { id: true } },
      },
      take: 4,
      orderBy: { createdAt: "desc" },
    });

    if (cursosDb && cursosDb.length > 0) {
      cursosPublicados = cursosDb.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        descripcion: c.descripcion,
        tutorNombre: `${c.tutor.nombre} ${c.tutor.apellido}`,
        totalContenidos: c.contenidos.length,
      }));
    }
  } catch {
    // Si la base de datos o supabase no responden, usamos los cursos por defecto
    cursosPublicados = [];
  }

  const tieneCursosDb = cursosPublicados.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Barra de navegación superior */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                Plataforma Educativa
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                Prof. Fabio Andrés Aguirre
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#cursos" className="transition-colors hover:text-foreground">
              Cursos
            </a>
            <a href="#metodologia" className="transition-colors hover:text-foreground">
              Metodología
            </a>
            <a href="#experiencia" className="transition-colors hover:text-foreground">
              Experiencia Estudiantil
            </a>
            <a href="#docente" className="transition-colors hover:text-foreground">
              Docente
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {usuarioAutenticado ? (
              <Link href="/dashboard" className={cn(buttonVariants(), "gap-2 font-medium")}>
                  Ir a mi Panel
                  <ArrowRight className="h-4 w-4" />
                </Link>
            ) : (
              <>
                <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}>Acceso</Link>
                <Link href="/login" className={cn(buttonVariants(), "gap-2 shadow-sm font-semibold")}>
                    Ingresar al Campus
                    <ArrowRight className="h-4 w-4" />
                  </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
          {/* Fondos luminosos sutiles con gradientes */}
          <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-40">
            <div className="h-[450px] w-[650px] rounded-full bg-gradient-to-tr from-primary/30 to-duo-blue/30 blur-3xl filter" />
            <div className="h-[300px] w-[400px] rounded-full bg-gradient-to-br from-indigo-400/20 to-duo-gold/20 blur-2xl filter -translate-x-20 translate-y-20" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Columna Izquierda: Mensaje principal */}
              <div className="lg:col-span-7 flex flex-col items-start gap-6 text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  <span>Ambiente de Aprendizaje Tecnológico Digital</span>
                </div>

                <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
                  Aprende tecnología con{" "}
                  <span className="bg-gradient-to-r from-primary via-indigo-500 to-sky-500 bg-clip-text text-transparent">
                    propósito, práctica y seguimiento continuo
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  Un campus virtual diseñado para transformar la curiosidad en habilidades reales.
                  Accede a contenidos interactivos, proyectos aplicados, progreso gamificado y
                  acompañamiento docente permanente.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto pt-2">
                  <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "h-12 px-7 text-base font-semibold shadow-md gap-2")}>
                      {usuarioAutenticado ? "Entrar al Campus Virtual" : "Comenzar Ahora"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                  <a href="#cursos" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-6 text-base font-medium")}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Explorar Cursos
                    </a>
                </div>

                {/* Métricas destacadas */}
                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-border/60 w-full max-w-lg mt-2">
                  <div>
                    <p className="font-heading text-2xl font-bold text-foreground">100%</p>
                    <p className="text-xs text-muted-foreground font-medium">Práctico y guiado</p>
                  </div>
                  <div>
                    <p className="font-heading text-2xl font-bold text-foreground">24/7</p>
                    <p className="text-xs text-muted-foreground font-medium">Acceso a clases</p>
                  </div>
                  <div>
                    <p className="font-heading text-2xl font-bold text-foreground">En Vivo</p>
                    <p className="text-xs text-muted-foreground font-medium">Tracking de progreso</p>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Tarjeta interactiva con vista previa visual */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto w-full max-w-md lg:max-w-none">
                  {/* Tarjeta principal flotante */}
                  <div className="rounded-2xl border border-border/80 bg-card/95 p-6 shadow-2xl backdrop-blur-sm transition-all hover:shadow-primary/5">
                    <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                          <Code2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-heading text-sm font-semibold text-foreground">
                            Mi Ruta de Aprendizaje
                          </p>
                          <p className="text-xs text-muted-foreground">Progreso general de ciclo</p>
                        </div>
                      </div>
                      <Badge variant="success" className="font-semibold">
                        Activo
                      </Badge>
                    </div>

                    {/* Barra de progreso de ejemplo */}
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">Avance curricular</span>
                        <span className="text-primary">78% Completado</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-1000"
                          style={{ width: "78%" }}
                        />
                      </div>
                    </div>

                    {/* Lista de temas interactivos */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                          <div className="text-xs">
                            <p className="font-medium text-foreground">Semana 1: Fundamentos & Lógica</p>
                            <p className="text-muted-foreground">Completado</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950/40">
                          100%
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="flex items-center gap-3">
                          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                          <div className="text-xs">
                            <p className="font-medium text-foreground">Semana 2: Estructuras y Algoritmos</p>
                            <p className="text-primary font-medium">En curso actualmente</p>
                          </div>
                        </div>
                        <Link href="/login" className={buttonVariants({ variant: "default", size: "xs" })}>Continuar</Link>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30 opacity-70">
                        <div className="flex items-center gap-3">
                          <div className="h-5 w-5 rounded-full border border-muted-foreground/30 flex items-center justify-center text-[10px] text-muted-foreground">
                            3
                          </div>
                          <div className="text-xs">
                            <p className="font-medium text-muted-foreground">Semana 3: Proyecto Aplicado</p>
                            <p className="text-muted-foreground text-[11px]">Próximamente</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">Bloqueado</span>
                      </div>
                    </div>

                    {/* Mini card de racha / gamificación */}
                    <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                          <Flame className="h-4 w-4 fill-orange-500 animate-flame-pulse" />
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          Racha de estudio: <strong className="text-orange-500">5 días seguidos</strong>
                        </span>
                      </div>
                      <Badge variant="achievement" className="text-[11px]">
                        Nivel 3 ⚡
                      </Badge>
                    </div>
                  </div>

                  {/* Detalle decorativo flotante */}
                  <div className="absolute -bottom-4 -left-4 rounded-xl border border-border bg-card p-3 shadow-lg flex items-center gap-2.5 hidden sm:flex">
                    <Award className="h-5 w-5 text-duo-gold" />
                    <span className="text-xs font-bold text-foreground">
                      ¡Insignia de Logro Desbloqueada!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PILARES / METODOLOGÍA */}
        <section id="metodologia" className="py-20 bg-muted/30 border-y border-border/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="outline" className="mb-3 text-xs tracking-wide uppercase font-semibold">
                Nuestra Metodología
              </Badge>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Diseñado para aprender haciendo
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                La plataforma integra pedagogía moderna y herramientas tecnológicas para asegurar
                que cada estudiante comprenda y aplique cada concepto.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border border-border/70 hover:border-primary/40 transition-all hover:shadow-md">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Layers className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Estructura por Semanas
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Módulos claros y secuenciales. Cada lección cuenta con objetivos precisos para
                    evitar sobrecarga y optimizar tu tiempo.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/70 hover:border-primary/40 transition-all hover:shadow-md">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="h-12 w-12 rounded-xl bg-duo-blue/10 text-duo-blue flex items-center justify-center font-bold">
                    <Laptop className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Contenido Multimedia
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Videoclases dinámicas, guías paso a paso, ejercicios en código y documentos de
                    apoyo descargables en cualquier dispositivo.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/70 hover:border-primary/40 transition-all hover:shadow-md">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                    <Flame className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Progreso Gamificado
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Rachas de estudio, visualización de avance porcentual y felicitaciones animadas
                    que reconocen tu esfuerzo constante.
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border/70 hover:border-primary/40 transition-all hover:shadow-md">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <FileCheck2 className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Feedback y Tutoría
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Seguimiento continuo por parte del docente con asignación de tareas, revisión de
                    avances y soporte académico individualizado.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* SECCIÓN DE CURSOS */}
        <section id="cursos" className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <Badge variant="outline" className="mb-2 text-xs uppercase font-semibold">
                  Oferta Formativa
                </Badge>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                  Cursos y Rutas Tecnológicas
                </h2>
                <p className="mt-2 text-muted-foreground max-w-xl">
                  {tieneCursosDb
                    ? "Explora los cursos activos actualmente en la plataforma institucional."
                    : "Descubre los programas de tecnología diseñados para el desarrollo de competencias del siglo XXI."}
                </p>
              </div>

              <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "gap-2 shrink-0 self-start md:self-end")}>
                  Acceder a todos los cursos
                  <ChevronRight className="h-4 w-4" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tieneCursosDb
                ? cursosPublicados.map((curso, idx) => (
                    <Card
                      key={curso.id}
                      className="group flex flex-col justify-between overflow-hidden border border-border/80 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
                    >
                      <div>
                        {/* Portada decorativa con gradiente */}
                        <div
                          className={`h-36 w-full bg-gradient-to-tr ${
                            CURSOS_DESTACADOS_DEFAULT[idx % CURSOS_DESTACADOS_DEFAULT.length].gradient
                          } p-4 flex flex-col justify-between text-white`}
                        >
                          <Badge className="bg-black/30 backdrop-blur-md text-white border-none w-fit">
                            Curso Oficial
                          </Badge>
                          <BookOpen className="h-6 w-6 text-white/80 self-end" />
                        </div>

                        <CardContent className="p-5 flex flex-col gap-2">
                          <h3 className="font-heading text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {curso.titulo}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {curso.descripcion}
                          </p>
                        </CardContent>
                      </div>

                      <div className="p-5 pt-0 border-t border-border/50 mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{curso.totalContenidos || 0} lecciones</span>
                        <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "xs" }), "gap-1 font-semibold text-primary")}>
                            Entrar
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                      </div>
                    </Card>
                  ))
                : CURSOS_DESTACADOS_DEFAULT.map((curso) => (
                    <Card
                      key={curso.id}
                      className="group flex flex-col justify-between overflow-hidden border border-border/80 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
                    >
                      <div>
                        <div
                          className={`h-36 w-full bg-gradient-to-tr ${curso.gradient} p-4 flex flex-col justify-between text-white`}
                        >
                          <Badge className="bg-black/30 backdrop-blur-md text-white border-none w-fit text-[11px]">
                            {curso.tag}
                          </Badge>
                          <Cpu className="h-6 w-6 text-white/80 self-end" />
                        </div>

                        <CardContent className="p-5 flex flex-col gap-2">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                            <span>{curso.nivel}</span>
                            <span>{curso.modulos}</span>
                          </div>
                          <h3 className="font-heading text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            {curso.titulo}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {curso.descripcion}
                          </p>
                        </CardContent>
                      </div>

                      <div className="p-5 pt-0 border-t border-border/50 mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Prof. Fabio Aguirre</span>
                        <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "xs" }), "gap-1 font-semibold text-primary")}>
                            Detalles
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                      </div>
                    </Card>
                  ))}
            </div>
          </div>
        </section>

        {/* EXPERIENCIA ESTUDIANTIL INTERACTIVA */}
        <section id="experiencia" className="py-20 bg-muted/20 border-t border-border/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge variant="outline" className="mb-3 text-xs uppercase font-semibold">
                  Experiencia del Estudiante
                </Badge>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                  Un aula virtual intuitiva que se adapta a tu ritmo
                </h2>
                <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                  Olvídate de plataformas confusas y desorganizadas. Este LMS fue construido pensando
                  en la claridad, motivación y concentración del estudiante:
                </p>

                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-heading text-sm font-bold text-foreground">
                        Botón &quot;Continuar donde lo dejaste&quot;
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Retoma tus lecciones al instante sin tener que buscar qué video o lectura te
                        quedaba pendiente.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-heading text-sm font-bold text-foreground">
                        Marcado automático de contenidos
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tus lecturas y videos vistos se registran en tiempo real actualizando tu barra
                        de progreso.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-duo-gold/15 p-2 text-duo-gold">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-heading text-sm font-bold text-foreground">
                        Celebraciones y reconocimientos
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Al completar el 100% de un curso, celebra tu logro y desbloquea tu certificado
                        de culminación.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <Link href="/login" className={cn(buttonVariants(), "gap-2")}>
                      Acceder a mi Cuenta de Estudiante
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
              </div>

              {/* Tarjeta Visual de presentación de panel */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">campus.fabioaguirre.edu</span>
                </div>

                <div className="pt-6 space-y-4">
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                        Última lección vista
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">15 min atrás</span>
                    </div>
                    <p className="font-heading text-base font-bold text-foreground mt-1">
                      Algoritmos de Ordenamiento & Condicionales
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Tema 4 de 12</span>
                      <span className="font-bold text-primary">33% completado</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted mt-1.5 overflow-hidden">
                      <div className="h-full bg-primary rounded-full w-1/3" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30">
                      <p className="text-xs text-muted-foreground">Cursos en progreso</p>
                      <p className="font-heading text-2xl font-bold text-foreground mt-1">3</p>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30">
                      <p className="text-xs text-muted-foreground">Temas aprobados</p>
                      <p className="font-heading text-2xl font-bold text-emerald-600 mt-1">24</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SOBRE EL DOCENTE */}
        <section id="docente" className="py-20 border-t border-border/60">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-lg mx-auto mb-6">
              <Users className="h-10 w-10" />
            </div>

            <Badge variant="outline" className="mb-3 text-xs uppercase font-semibold">
              Liderazgo Académico
            </Badge>

            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Prof. Fabio Andrés Aguirre
            </h2>
            <p className="text-sm font-semibold text-primary mt-1">
              Docente del Área de Tecnología e Informática
            </p>

            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              &ldquo;La educación en tecnología no se trata únicamente de aprender a usar herramientas,
              sino de cultivar el pensamiento crítico, la creatividad y la capacidad de resolver
              problemas reales para generar un impacto positivo en nuestra sociedad.&rdquo;
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1 text-xs font-medium text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Pedagogía Activa
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1 text-xs font-medium text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Proyectos STEAM
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1 text-xs font-medium text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Innovación Educativa
              </span>
            </div>
          </div>
        </section>

        {/* BANNER CTA FINAL */}
        <section className="py-20 bg-gradient-to-b from-background via-primary/5 to-background border-t border-border/60">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-primary/20 bg-card/80 p-8 sm:p-12 text-center shadow-xl backdrop-blur-md relative overflow-hidden">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl filter" />
              <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl filter" />

              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground max-w-2xl mx-auto">
                ¿Listo para comenzar a aprender hoy mismo?
              </h2>

              <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
                Ingresa con tu cuenta institucional y continúa construyendo tu futuro tecnológico con
                lecciones prácticas y guiadas.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "h-12 px-8 font-semibold shadow-md gap-2")}>
                    Ingresar al Campus Virtual
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                <a href="#cursos" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-6")}>Ver Cursos Disponibles</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border/60 bg-muted/20 py-12 text-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <p className="font-heading font-semibold text-foreground">Plataforma Educativa LMS</p>
              <p className="text-xs text-muted-foreground">Área de Tecnología e Innovación</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center sm:text-right">
            © {new Date().getFullYear()} Docente Fabio Andrés Aguirre. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
