import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-b from-primary/10 via-background to-background p-4">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">
        Plataforma Educativa
      </p>
      <LoginForm />
    </main>
  );
}