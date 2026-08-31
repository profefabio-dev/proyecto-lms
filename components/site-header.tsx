"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RolConocido = "ADMINISTRADOR" | "TUTOR" | "ESTUDIANTE";

const NAV_POR_ROL: Record<RolConocido, { href: string; label: string }[]> = {
  ADMINISTRADOR: [
    { href: "/admin", label: "Panel" },
    { href: "/admin/tutores", label: "Tutores" },
    { href: "/admin/usuarios", label: "Usuarios" },
  ],
  TUTOR: [
    { href: "/tutor", label: "Panel" },
    { href: "/tutor/estudiantes", label: "Estudiantes" },
    { href: "/tutor/cursos", label: "Mis cursos" },
  ],
  ESTUDIANTE: [
    { href: "/estudiante", label: "Mis cursos" },
    { href: "/estudiante/buscar", label: "Buscar" },
  ],
};

const ETIQUETA_ROL: Record<RolConocido, string> = {
  ADMINISTRADOR: "Administrador",
  TUTOR: "Tutor",
  ESTUDIANTE: "Estudiante",
};

// Barra de navegación compartida por las tres áreas de la plataforma. No
// existía ningún header ni forma de navegar entre secciones o cerrar
// sesión antes de este pase de diseño — cada página vivía aislada. Recibe
// el usuario ya resuelto por la página (todas las páginas protegidas ya
// hacen esa consulta para su propia guarda de sesión/rol), así que no
// repite ninguna consulta a la base de datos.
export function SiteHeader({
  usuario,
}: {
  usuario: { nombre: string; apellido: string; rol: string };
}) {
  const pathname = usePathname();
  const enlaces = NAV_POR_ROL[usuario.rol as RolConocido] ?? [];
  const inicioHref = enlaces[0]?.href ?? "/dashboard";
  const etiquetaRol = ETIQUETA_ROL[usuario.rol as RolConocido] ?? usuario.rol;

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex flex-wrap items-center gap-6">
          <Link
            href={inicioHref}
            className="text-lg font-bold tracking-tight text-foreground"
          >
            Plataforma <span className="text-primary">Fabio Aguirre</span>
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm" aria-label="Navegación principal">
            {enlaces.map((enlace) => {
              const activo =
                enlace.href === pathname ||
                (enlace.href !== inicioHref && pathname?.startsWith(`${enlace.href}/`));

              return (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-medium transition-colors",
                    activo
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {enlace.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-foreground">
              {usuario.nombre} {usuario.apellido}
            </p>
            <Badge variant="secondary">{etiquetaRol}</Badge>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
