import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  CheckCircle2,
  Code2,
  Compass,
  Cpu,
  Database,
  FileCheck2,
  Flame,
  GraduationCap,
  Laptop,
  Layers,
  Lightbulb,
  Rocket,
  Search,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { LandingCoursesCatalog, type LandingCurso } from "@/components/landing-courses-catalog";
import { cn } from "@/lib/utils";

// Cursos de muestra si la base de datos aún no tiene cursos publicados
const CURSOS_DESTACADOS_DEFAULT: LandingCurso[] = [
  {
    id: "demo-1",
    titulo: "Pensamiento Computacional y Algoritmos",
    descripcion:
      "Desarrolla la lógica mediante resolución de problemas prácticos, diagramas de flujo y estructuras básicas de código.",
    tag: "Lógica & Código",
    categoria: "algoritmos",
    nivel: "Iniciación",
    modulos: "8 Módulos",
    gradient: "from-blue-600 to-indigo-600",
  },
  {
    id: "demo-2",
    titulo: "Desarrollo Web Moderno con React y Next.js",
    descripcion:
      "Aprende a construir aplicaciones web completas, diseño responsivo y componentes interactivos.",
    tag: "Desarrollo Web",
    categoria: "web",
    nivel: "Intermedio",
    modulos: "12 Módulos",
    gradient: "from-indigo-600 to-violet-600",
  },
  {
    id: "demo-3",
    titulo: "Bases de Datos y Gestión de la Información",
    descripcion:
      "Diseña esquemas relacionales, consultas estructuradas SQL y conexión segura con aplicaciones modernas.",
    tag: "Bases de Datos",
    categoria: "datos",
    nivel: "Intermedio",
    modulos: "6 Módulos",
    gradient: "from-violet-600 to-purple-600",
  },
  {
    id: "demo-4",
    titulo: "Robótica Educativa, IoT y Automatización",
    descripcion:
      "Proyectos prácticos integrando sensores, actuadores y microcontroladores para solucionar retos reales.",
    tag: "Robótica & IoT",
    categoria: "robotica",
    nivel: "Práctico",
    modulos: "10 Módulos",
    gradient: "from-emerald-600 to-teal-700",
  },
];

export default async function Home() {
  let usuarioAutenticado = null;
  let cursosParaMostrar: LandingCurso[] = CURSOS_DESTACADOS_DEFAULT;

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
      take: 8,
      orderBy: { createdAt: "desc" },
    });

    if (cursosDb && cursosDb.length > 0) {
      cursosParaMostrar = cursosDb.map((c, index) => {
        const defaultMatch = CURSOS_DESTACADOS_DEFAULT[index % CURSOS_DESTACADOS_DEFAULT.length];
        return {
          id: c.id,
          titulo: c.titulo,
          descripcion: c.descripcion || "Explora las lecciones y actividades guiadas de este curso.",
          tag: defaultMatch.tag,
          categoria: defaultMatch.categoria,
          nivel: defaultMatch.nivel,
          modulos: `${c.contenidos.length} lecciones`,
          tutorNombre: `Prof. ${c.tutor.nombre} ${c.tutor.apellido}`,
          gradient: defaultMatch.gradient,
        };
      });
    }
  } catch {
    cursosParaMostrar = CURSOS_DESTACADOS_DEFAULT;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* HEADER DE NAVEGACIÓN */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs transition-transform group-hover:scale-105">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                Plataforma Educativa
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
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
            <a href="#rutas" className="transition-colors hover:text-foreground">
              Rutas STEAM
            </a>
            <a href="#metodologia" className="transition-colors hover:text-foreground">
              Metodología
            </a>
            <a href="#docente" className="transition-colors hover:text-foreground">
              Docente
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {usuarioAutenticado ? (
              <Link
                href="/dashboard"
                className={cn(buttonVariants(), "gap-2 font-medium min-h-10 touch:min-h-11 rounded-2xl")}
              >
                Ir a mi Panel
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "hidden sm:inline-flex min-h-10 touch:min-h-11 font-semibold text-muted-foreground hover:text-foreground"
                  )}
                >
                  Acceso
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants(),
                    "gap-2 shadow-xs font-semibold min-h-10 touch:min-h-11 rounded-2xl"
                  )}
                >
                  Ingresar al Campus
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION (Estilo Platzi: dinámico, enfocado en jóvenes) */}
        <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
          {/* Luces de fondo sutiles */}
          <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-30">
            <div className="h-[450px] w-[650px] rounded-full bg-primary/20 blur-3xl filter" />
            <div className="h-[300px] w-[400px] rounded-full bg-indigo-500/15 blur-2xl filter -translate-x-20 translate-y-20" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Columna Izquierda: Mensaje y Buscador */}
              <div className="lg:col-span-7 flex flex-col items-start gap-6 text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  <span>Campus Virtual & Aprendizaje STEAM</span>
                </div>

                <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
                  Aprende tecnología creando{" "}
                  <span className="bg-gradient-to-r from-primary via-indigo-400 to-sky-400 bg-clip-text text-transparent">
                    proyectos reales
                  </span>
                  .
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  Un aula virtual moderna diseñada para que domines programación, robótica y lógica
                  a tu propio ritmo, con retos interactivos, rachas de estudio y acompañamiento docente.
                </p>

                {/* Acciones principales */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto pt-2">
                  <Link
                    href="/login"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "h-12 min-h-11 touch:min-h-11 px-7 text-base font-semibold shadow-xs gap-2 rounded-2xl"
                    )}
                  >
                    {usuarioAutenticado ? "Entrar al Campus" : "Comenzar Ahora"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <a
                    href="#cursos"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "h-12 min-h-11 touch:min-h-11 px-6 text-base font-medium rounded-2xl"
                    )}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Explorar Cursos
                  </a>
                </div>

                {/* Tecnologías destacadas en píldoras */}
                <div className="pt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground mr-1">Rutas destacadas:</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/60 px-2.5 py-1 font-medium">
                    <Zap className="size-3.5 text-primary" aria-hidden="true" />
                    React & Web
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/60 px-2.5 py-1 font-medium">
                    <Bot className="size-3.5 text-primary" aria-hidden="true" />
                    Robótica & Arduino
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/60 px-2.5 py-1 font-medium">
                    <Lightbulb className="size-3.5 text-primary" aria-hidden="true" />
                    Algoritmos
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/60 px-2.5 py-1 font-medium">
                    <Database className="size-3.5 text-primary" aria-hidden="true" />
                    SQL & Backend
                  </span>
                </div>
              </div>

              {/* Columna Derecha: Tarjeta interactiva con vista previa visual */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto w-full max-w-md lg:max-w-none">
                  {/* Tarjeta principal interactiva */}
                  <div className="rounded-2xl border border-border/80 bg-card/95 p-6 shadow-2xl backdrop-blur-sm transition-all hover:border-primary/40">
                    <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                          <Code2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-heading text-sm font-bold text-foreground">
                            Mi Ruta de Aprendizaje
                          </p>
                          <p className="text-xs text-muted-foreground">Desarrollo Web & Código</p>
                        </div>
                      </div>
                      <Badge variant="success" className="font-semibold">
                        Activo
                      </Badge>
                    </div>

                    {/* Barra de progreso */}
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">Avance del ciclo</span>
                        <span className="text-primary font-bold">78% Completado</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-sky-400 rounded-full transition-all duration-1000"
                          style={{ width: "78%" }}
                        />
                      </div>
                    </div>

                    {/* Lista de temas del aula */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/40">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                          <div className="text-xs">
                            <p className="font-medium text-foreground">Semana 1: Fundamentos & Lógica</p>
                            <p className="text-muted-foreground">Completado</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full">
                          100%
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/10 border border-primary/25">
                        <div className="flex items-center gap-3">
                          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                          <div className="text-xs">
                            <p className="font-medium text-foreground">Semana 2: Estructuras y Componentes</p>
                            <p className="text-primary font-medium">En curso actualmente</p>
                          </div>
                        </div>
                        <Link
                          href="/login"
                          className={cn(buttonVariants({ size: "xs" }), "rounded-2xl text-xs font-semibold")}
                        >
                          Continuar
                        </Link>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30 opacity-70">
                        <div className="flex items-center gap-3">
                          <div className="h-5 w-5 rounded-full border border-muted-foreground/30 flex items-center justify-center text-[10px] text-muted-foreground font-semibold">
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

                    {/* Mini widget de racha */}
                    <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-2xl bg-amber-500/15 text-amber-500">
                          <Flame className="h-4 w-4 fill-amber-500 animate-flame-pulse" />
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          Racha activa: <strong className="text-amber-500">5 días seguidos</strong>
                        </span>
                      </div>
                      <Badge variant="achievement" className="text-[11px]">
                        Nivel 3
                      </Badge>
                    </div>
                  </div>

                  {/* Detalle decorativo flotante */}
                  <div className="absolute -bottom-4 -left-4 rounded-2xl border border-border/80 bg-card p-3 shadow-lg flex items-center gap-2.5 hidden sm:flex">
                    <Award className="h-5 w-5 text-amber-400" />
                    <span className="text-xs font-bold text-foreground">
                      Insignia: Desarrollador Jr.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RUTAS DE APRENDIZAJE STEAM (Estilo Platzi: De cero a avanzado) */}
        <section id="rutas" className="py-20 bg-muted/20 border-y border-border/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="outline" className="mb-3 text-xs tracking-wide uppercase font-semibold">
                Ruta Formativa
              </Badge>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                ¿Cómo aprendes en nuestro campus?
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Una trayectoria pedagógica paso a paso para convertir la curiosidad en proyectos tecnológicos funcionales.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs relative flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 font-extrabold text-base">
                    01
                  </span>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Pensamiento Lógico & Algoritmos
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Aprende las bases de la resolución de problemas, estructuras condicionales y cómo dar instrucciones claras al computador.
                  </p>
                </div>
                <div className="pt-6 border-t border-border/50 mt-6 text-xs text-primary font-semibold flex items-center gap-1">
                  Fundamento esencial <ArrowRight className="size-3" />
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs relative flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 font-extrabold text-base">
                    02
                  </span>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Desarrollo Web & Código Vivo
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Crea sitios y aplicaciones interactivas con React, componentes visuales, bases de datos estructuradas y diseño moderno.
                  </p>
                </div>
                <div className="pt-6 border-t border-border/50 mt-6 text-xs text-primary font-semibold flex items-center gap-1">
                  Proyectos digitales <ArrowRight className="size-3" />
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs relative flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 font-extrabold text-base">
                    03
                  </span>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Robótica, Sensores & Hardware
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Lleva el código a la realidad con microcontroladores, sensores IoT y automatización para solucionar desafíos cotidianos.
                  </p>
                </div>
                <div className="pt-6 border-t border-border/50 mt-6 text-xs text-primary font-semibold flex items-center gap-1">
                  Aplicación en el mundo real <ArrowRight className="size-3" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CATÁLOGO DE CURSOS INTERACTIVO (Con Filtros & Buscador estilo Platzi) */}
        <section id="cursos" className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <Badge variant="outline" className="mb-2 text-xs uppercase font-semibold">
                  Oferta Formativa
                </Badge>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                  Cursos y Talleres Disponibles
                </h2>
                <p className="mt-2 text-muted-foreground max-w-xl">
                  Selecciona una categoría o busca por tecnología para explorar los contenidos y proyectos activos.
                </p>
              </div>

              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "gap-2 shrink-0 self-start md:self-end min-h-11 rounded-2xl"
                )}
              >
                Acceder al campus
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Catálogo Interactivo en Cliente */}
            <LandingCoursesCatalog cursos={cursosParaMostrar} />
          </div>
        </section>

        {/* PILARES / METODOLOGÍA ACTIVA */}
        <section id="metodologia" className="py-20 bg-muted/20 border-t border-border/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="outline" className="mb-3 text-xs tracking-wide uppercase font-semibold">
                Nuestra Metodología
              </Badge>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Diseñado para aprender haciendo
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Pedagogía activa con herramientas digitales para que cada estudiante comprenda y aplique cada concepto.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="rounded-2xl border border-border/70 hover:border-primary/40 transition-all hover:shadow-xs">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Layers className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Estructura por Semanas
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Módulos claros y secuenciales. Cada lección cuenta con objetivos precisos y entregas organizadas.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-border/70 hover:border-primary/40 transition-all hover:shadow-xs">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                    <Laptop className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Contenido Práctico
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Videoclases explicativas, guías ilustradas, ejercicios de código y material de apoyo descargable.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-border/70 hover:border-primary/40 transition-all hover:shadow-xs">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    <Flame className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Progreso Gamificado
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Rachas de estudio diarias, visualización de avance e insignias de logro que reconocen tu constancia.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-border/70 hover:border-primary/40 transition-all hover:shadow-xs">
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                    <FileCheck2 className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Acompañamiento Docente
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Seguimiento continuo por parte del docente con orientación académica, retroalimentación y soporte permanente.
                  </p>
                </CardContent>
              </Card>
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

            <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Espacio formativo a cargo del docente Fabio Andrés Aguirre, orientando a los estudiantes
              en el desarrollo de competencias tecnológicas, pensamiento lógico y proyectos prácticos STEAM.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/60 px-3.5 py-1 text-xs font-medium text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Pedagogía Activa
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/60 px-3.5 py-1 text-xs font-medium text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Proyectos STEAM
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/60 px-3.5 py-1 text-xs font-medium text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Innovación Educativa
              </span>
            </div>
          </div>
        </section>

        {/* BANNER CTA FINAL */}
        <section className="py-20 bg-gradient-to-b from-background via-primary/5 to-background border-t border-border/60">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-primary/20 bg-card/90 p-8 sm:p-12 text-center shadow-xl backdrop-blur-md relative overflow-hidden">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl filter" />
              <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl filter" />

              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground max-w-2xl mx-auto">
                ¿Listo para construir tus propios proyectos hoy?
              </h2>

              <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
                Ingresa con tu cuenta institucional y continúa dominando las herramientas tecnológicas del futuro.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 min-h-11 touch:min-h-11 px-8 font-semibold shadow-xs gap-2 rounded-2xl"
                  )}
                >
                  Ingresar al Campus Virtual
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#cursos"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-12 min-h-11 touch:min-h-11 px-6 rounded-2xl"
                  )}
                >
                  Ver Cursos Disponibles
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border/60 bg-muted/20 py-12 text-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
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
