"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { correoPerteneceACuentaDesactivada } from "@/lib/actions/check-account-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MENSAJE_CREDENCIALES_INCORRECTAS = "Correo o contraseña incorrectos. Por favor verifica tus datos.";
const MENSAJE_CUENTA_DESACTIVADA =
  "Tu cuenta fue desactivada por el administrador. Contáctalo para más información.";

export function LoginForm({
  errorInicial,
}: {
  /** Viene de `/login?error=cuenta_desactivada` (segunda capa de bloqueo en `app/dashboard/page.tsx`). */
  errorInicial?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState<string | null>(errorInicial ?? null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error: errorLogin } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (!errorLogin) {
      setCargando(false);
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // El login falló: puede ser contraseña incorrecta o una cuenta
    // desactivada (Supabase Auth bloquea el signIn de una cuenta con
    // `ban_duration` — ver US23 — y devuelve el mismo error genérico que
    // una contraseña mal escrita, sin distinguir el motivo). Se consulta
    // aparte para mostrar el mensaje correcto en vez de dejar que el
    // usuario piense que escribió mal su contraseña.
    const desactivada = await correoPerteneceACuentaDesactivada(email.trim());

    setCargando(false);
    setError(desactivada ? MENSAJE_CUENTA_DESACTIVADA : MENSAJE_CREDENCIALES_INCORRECTAS);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 w-full">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-pop-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Correo Electrónico
        </Label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <Mail className="h-4 w-4" />
          </div>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            disabled={cargando}
            placeholder="estudiante@institucion.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9 h-11 bg-background/50 focus:bg-background transition-colors"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="password"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Contraseña
          </Label>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <Lock className="h-4 w-4" />
          </div>
          <Input
            id="password"
            type={mostrarPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            disabled={cargando}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9 pr-10 h-11 bg-background/50 focus:bg-background transition-colors"
          />
          <button
            type="button"
            onClick={() => setMostrarPassword(!mostrarPassword)}
            className="absolute inset-y-0 right-0 flex items-center justify-center min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground transition-colors"
            aria-label={mostrarPassword ? "Ocultar contraseña" : "Ver contraseña"}
          >
            {mostrarPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={cargando}
        className="w-full h-11 min-h-11 touch:min-h-11 text-sm font-semibold tracking-wide shadow-md transition-all gap-2"
      >
        {cargando ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Validando acceso...</span>
          </>
        ) : (
          <span>Ingresar a la Plataforma</span>
        )}
      </Button>
    </form>
  );
}
