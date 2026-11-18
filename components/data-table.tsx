import { cn } from "@/lib/utils";

// Tabla de datos común (Admin y Superadmin). Va dentro de un contenedor con
// desplazamiento horizontal y un ancho mínimo, para que en pantallas
// angostas se desplace en vez de recortar o aplastar columnas (paquete 2
// de interfaz). `Th` y `Td` fijan el relleno y la tipografía de las celdas;
// la primera y la última columna llevan más relleno lateral con `primera` y
// `ultima`.
export function DataTable({
  children,
  anchoMinimo = "36rem",
}: {
  children: React.ReactNode;
  anchoMinimo?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
      <table className="w-full border-collapse text-sm" style={{ minWidth: anchoMinimo }}>
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  primera,
  ultima,
}: {
  children?: React.ReactNode;
  primera?: boolean;
  ultima?: boolean;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "py-3.5 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        primera && "pl-5",
        ultima && "pr-5"
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  primera,
  ultima,
  className,
  colSpan,
}: {
  children?: React.ReactNode;
  primera?: boolean;
  ultima?: boolean;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn("py-3 pr-4", primera && "pl-5", ultima && "pr-5", className)}
    >
      {children}
    </td>
  );
}
