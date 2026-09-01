"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { correoPerteneceACuentaDesactivada } from "@/lib/actions/check-account-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MENSAJE_CREDENCIALES_INCORRECTAS = "Credenciales incorrectas. Intenta de nuevo.";
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
  const [error, setError] = useState<string | null>(errorInicial ?? null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error: errorLogin } = await supabase.auth.signInWithPassword({
      email,
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
    const desactivada = await correoPerteneceACuentaDesactivada(email);

    setCargando(false);
    setError(desactivada ? MENSAJE_CUENTA_DESACTIVADA : MENSAJE_CREDENCIALES_INCORRECTAS);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>
          Plataforma Educativa — Docente Fabio Andrés Aguirre
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
