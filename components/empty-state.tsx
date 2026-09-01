import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Estado vacío reutilizable ("todavía no hay nada aquí"). Antes de este
// componente, cada página escribía su propio <p className="text-muted-foreground">
// suelto para este caso — funcionaba, pero no se sentía distinto de un error
// o de contenido real cargando. Este componente le da una caja con borde
// punteado y un ícono, consistente en toda la plataforma.
export function EmptyState({
  icon: Icon,
  message,
  className,
}: {
  icon: LucideIcon;
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center",
        className
      )}
    >
      <Icon className="size-8 text-muted-foreground/60" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
