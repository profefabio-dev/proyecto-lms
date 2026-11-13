import { LoaderCircle } from "lucide-react";

// Pantalla de carga mientras una página espera sus datos (antes, el usuario
// veía la pantalla anterior congelada sin ninguna señal de que algo pasaba).
export default function Loading() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-3"
    >
      <LoaderCircle
        className="size-8 animate-spin text-primary motion-reduce:animate-none"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">Cargando...</p>
    </main>
  );
}
