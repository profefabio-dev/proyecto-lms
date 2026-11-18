import type { LucideIcon } from "lucide-react";

// Pantalla completa de estado (página no encontrada, error inesperado).
// Paquete 1 de interfaz (2026-11-12): antes, una URL equivocada o un fallo
// mostraba la pantalla genérica de Next.js, sin marca ni salida clara. Misma
// base visual que el login (fondo degradado y rótulo de la plataforma) para
// que se sienta parte de la misma aplicación. No usa hooks, así que se puede
// usar tanto desde Server Components (`not-found.tsx`) como desde Client
// Components (`error.tsx`).
export function StatusScreen({
  icon: Icon,
  titulo,
  descripcion,
  children,
}: {
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-b from-primary/10 via-background to-background p-4">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">
        Plataforma Educativa
      </p>
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center shadow-sm">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-7" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-semibold">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
        {children && <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>}
      </div>
    </main>
  );
}
