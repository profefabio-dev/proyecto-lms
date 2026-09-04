import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

/**
 * Migas de pan del encabezado (estilo Chamilo): ubican al usuario dentro de
 * la jerarquía actual (p. ej. "Mis cursos / Matemáticas 6A"). El último
 * elemento se muestra siempre como texto plano, sin enlace, aunque traiga
 * `href`, porque representa la página en la que ya está el usuario.
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Ruta de navegación" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, i) => {
          const esUltimo = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
              {item.href && !esUltimo ? (
                <Link
                  href={item.href}
                  className="truncate transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn("truncate", esUltimo && "font-medium text-foreground")}
                  aria-current={esUltimo ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
