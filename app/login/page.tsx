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
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-b from-primary/10 via-background to-background p-4">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">
        Plataforma Educativa
      </p>
      <LoginForm errorInicial={errorInicial} />
    </main>
  );
}
