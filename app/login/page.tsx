import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
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
      {/* PANEL IZQUIERDO: Branding visual e identidad (oculto en móviles) */}
      <section className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-12 bg-gradient-to-br from-sidebar via-background to-primary/15 border-r border-border/60 relative overflow-hidden">
        {/* Marca institucional superior */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading text-sm font-bold text-foreground">Plataforma Educativa</p>
            <p className="text-xs text-muted-foreground font-medium">Campus Virtual de Aprendizaje</p>
          </div>
        </div>

        {/* Mensaje central pedagógico */}
        <div className="relative z-10 max-w-xl space-y-6 my-auto py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Campus Virtual & Aprendizaje STEAM</span>
          </div>

          <h1 className="font-heading text-4xl xl:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Aprende tecnología creando{" "}
            <span className="bg-gradient-to-r from-primary via-indigo-400 to-sky-400 bg-clip-text text-transparent">
              proyectos reales
            </span>
            .
          </h1>

          <p className="text-base text-muted-foreground leading-relaxed">
            Bienvenido al aula virtual. Un espacio diseñado para acompañar tu proceso formativo con
            lecciones interactivas, retos de código, robótica y seguimiento continuo de tus avances.
          </p>

          {/* Tarjetas de características */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <Flame className="h-4 w-4 fill-amber-500" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Gamificación
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Mantén tus rachas de estudio y celebra cada meta alcanzada con insignias.
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-500 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Avance Guiado
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Confirma cada lección y actividad completada para mantener tu registro al día.
              </p>
            </div>
          </div>
        </div>

        {/* Footer del panel izquierdo */}
        <div className="relative z-10 flex items-center justify-between border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">Prof. Fabio Andrés Aguirre</span>
          </div>
          <span>Plataforma Académica</span>
        </div>
      </section>

      {/* PANEL DERECHO: Formulario de Login centrado y accesible */}
      <section className="col-span-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        {/* Cabecera móvil */}
        <div className="flex items-center gap-2.5 lg:hidden mb-6">
          <div className="h-8 w-8 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold font-heading text-foreground">Plataforma Educativa</span>
        </div>

        {/* Contenedor central del formulario */}
        <div className="mx-auto w-full max-w-sm my-auto py-8 space-y-8">
          <div className="space-y-2 text-left">
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Iniciar Sesión
            </h2>
            <p className="text-sm text-muted-foreground">
              Ingresa tus credenciales para acceder a tus asignaturas y contenidos.
            </p>
          </div>

          {/* Formulario de Login */}
          <LoginForm errorInicial={errorInicial} />

          {/* Caja de ayuda / soporte */}
          <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 text-xs text-muted-foreground flex items-start gap-3">
            <HelpCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <p className="leading-relaxed">
              ¿Tienes dudas con tus datos de acceso? Consulta directamente con tu docente de área
              para verificar tu correo registrado o restablecer tu contraseña.
            </p>
          </div>
        </div>

        {/* Footer inferior del formulario */}
        <div className="text-center text-xs text-muted-foreground pt-6">
          © {new Date().getFullYear()} Plataforma Educativa.
        </div>
      </section>
    </main>
  );
}
