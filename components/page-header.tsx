import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Encabezado común de las páginas de gestión (Admin y Superadmin): título,
// descripción corta y, opcionalmente, una insignia con un conteo. Mismo
// estilo que ya usa la lista de estudiantes del Tutor (rediseño de
// 2026-11), para que todos los roles se sientan parte de la misma
// plataforma.
export function PageHeader({
  titulo,
  descripcion,
  insignia,
  icono: Icono,
}: {
  titulo: string;
  descripcion: string;
  insignia?: string;
  icono?: LucideIcon;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {insignia && (
        <Badge variant="outline" className="self-start text-xs font-semibold sm:self-auto">
          {Icono && <Icono className="mr-1 size-3 text-primary" aria-hidden="true" />}
          {insignia}
        </Badge>
      )}
    </div>
  );
}
