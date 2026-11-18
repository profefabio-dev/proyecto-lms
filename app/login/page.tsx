import Link from "next/link";
import {
  GraduationCap,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Award,
  Flame,
  HelpCircle,
} from "lucide-react";
import { LoginForm } from "@/components/login-form";

const MENSAJE_CUENTA_DESACTIVADA =
  "Tu cuenta fue desactivada por el administrador. Contáctalo para más información.";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Segunda capa de bloqueo (`app/dashboard/page.tsx`): un usuario cuya
  // cuenta se desactivó DESPUÉS de emitirse su access token llega hasta
  // acá con `?error=cuenta_desactivada` en vez de con el login bloqueado
  // desde el inicio (eso lo cubre `check-account-status.ts` en el form).
  const errorInicial = error === "cuenta_desactivada" ? MENSAJE_CUENTA_DESACTIVADA : null;

  return (
    <main className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-background">
      {/* PANEL IZQUIERDO: Branding visual, inspiración y valor (oculto en móviles) */}
      <section className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden">
        {/* Luces y gradientes de fondo */}
        <div className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute top-1/4 -left-20 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute bottom-1/4 right-0 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>

        {/* Barra superior de panel */}
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a la portada principal
          </Link>
        </div>

        {/* Mensaje central pedagógico e inspirador */}
        <div className="relative z-10 max-w-xl space-y-6 my-auto py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/20 px-3.5 py-1 text-xs font-semibold text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
            <span>Campus Virtual de Aprendizaje</span>
          </div>

          <h1 className="font-heading text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
            La tecnología se aprende{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
              creando, experimentando y resolviendo
            </span>
            .
          </h1>

          <p className="text-base text-slate-300 leading-relaxed">
            Bienvenido al aula digital del docente Fabio Andrés Aguirre. Un espacio para potenciar
            tus habilidades prácticas en programación, pensamiento computacional y proyectos STEAM.
          </p>

          {/* Tarjeta de preview interactivo de logros */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-duo-gold mb-1">
                <Flame className="h-4 w-4 fill-duo-gold" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Gamificación
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Mantén tus rachas y desbloquea insignias a medida que avanzas.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Progreso en Vivo
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Cada lección vista se registra automáticamente en tu avance.
              </p>
            </div>
          </div>
        </div>

        {/* Footer del panel izquierdo */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-indigo-400" />
            <span className="font-medium text-slate-300">Prof. Fabio Andrés Aguirre</span>
          </div>
          <span>Área de Tecnología e Innovación</span>
        </div>
      </section>

      {/* PANEL DERECHO: Formulario de Login centrado y accesible */}
      <section className="col-span-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        {/* Cabecera móvil (para volver al inicio) */}
        <div className="flex items-center justify-between lg:hidden mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold font-heading">Campus LMS</span>
          </div>
        </div>

        {/* Contenedor central del formulario */}
        <div className="mx-auto w-full max-w-sm my-auto py-8 space-y-8">
          <div className="space-y-2 text-left">
            <div className="hidden lg:flex items-center gap-2.5 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="font-heading text-sm font-bold text-foreground">Plataforma Educativa</p>
                <p className="text-xs text-muted-foreground">Campus Virtual Institucional</p>
              </div>
            </div>

            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Iniciar Sesión
            </h2>
            <p className="text-sm text-muted-foreground">
              Ingresa tus credenciales para acceder a tus asignaturas y contenidos.
            </p>
          </div>

          {/* Formulario mejorado */}
          <LoginForm errorInicial={errorInicial} />

          {/* Caja de ayuda / soporte */}
          <div className="rounded-xl border border-border/80 bg-muted/40 p-4 text-xs text-muted-foreground flex items-start gap-3">
            <HelpCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <p className="leading-relaxed">
              ¿Olvidaste tu contraseña o tienes problemas para ingresar? Solicita la verificación de
              tu cuenta directamente a tu docente de área.
            </p>
          </div>
        </div>

        {/* Footer inferior del formulario */}
        <div className="text-center text-xs text-muted-foreground pt-6">
          © {new Date().getFullYear()} Plataforma Educativa Fabio Andrés Aguirre.
        </div>
      </section>
    </main>
  );
}
