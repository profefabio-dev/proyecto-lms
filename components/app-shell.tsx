"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCog,
  GraduationCap,
  BookOpen,
  Search,
  Building2,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, iniciales } from "@/components/ui/avatar";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/breadcrumbs";
import { cn } from "@/lib/utils";

type RolConocido = "ADMINISTRADOR" | "TUTOR" | "ESTUDIANTE" | "SUPERADMIN";
type Usuario = { nombre: string; apellido: string; rol: string };

const NAV_POR_ROL: Record<RolConocido, { href: string; label: string; icon: LucideIcon }[]> = {
  ADMINISTRADOR: [
    { href: "/admin", label: "Panel", icon: LayoutDashboard },
    { href: "/admin/tutores", label: "Tutores", icon: UserCog },
    { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  ],
  TUTOR: [
    { href: "/tutor", label: "Panel", icon: LayoutDashboard },
    { href: "/tutor/estudiantes", label: "Estudiantes", icon: GraduationCap },
    { href: "/tutor/cursos", label: "Mis cursos", icon: BookOpen },
  ],
  ESTUDIANTE: [
    { href: "/estudiante", label: "Mis cursos", icon: BookOpen },
    { href: "/estudiante/buscar", label: "Buscar", icon: Search },
  ],
  // US25: el Super Administrador solo gestiona espacios, no cursos ni
  // usuarios individuales dentro de un espacio (eso le corresponde al
  // Administrador de cada uno).
  SUPERADMIN: [{ href: "/superadmin", label: "Espacios", icon: Building2 }],
};

const ETIQUETA_ROL: Record<RolConocido, string> = {
  ADMINISTRADOR: "Administrador",
  TUTOR: "Tutor",
  ESTUDIANTE: "Estudiante",
  SUPERADMIN: "Super Administrador",
};

/**
 * Shell de las tres áreas protegidas de la plataforma (Admin/Tutor/
 * Estudiante). Menú lateral izquierdo, estilo Chamilo: en pantallas anchas
 * (md+) nunca desaparece del todo — se colapsa a un riel de solo íconos
 * (`abierto = false`) o se expande a panel completo con etiquetas
 * (`abierto = true`); en pantallas angostas se sigue comportando como un
 * panel superpuesto con fondo oscurecido detrás, porque ahí no hay espacio
 * para dejar un riel fijo. El mismo botón de hamburguesa en el header
 * controla ambos casos. Recibe el usuario ya resuelto por la página (todas
 * las páginas protegidas ya hacen esa consulta para su propia guarda de
 * sesión/rol), así que no repite ninguna consulta a la base de datos.
 */
export function AppShell({
  usuario,
  breadcrumbs,
  children,
}: {
  usuario: Usuario;
  /** Ruta de navegación mostrada en el header (opcional, no rompe páginas que no la pasen). */
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(true);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Fondo oscurecido: solo tiene efecto en pantallas angostas (md:hidden) —
          ahí el menú se superpone al contenido en vez de correrlo. */}
      {abierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      <Sidebar usuario={usuario} abierto={abierto} onCerrar={() => setAbierto(false)} />

      {/* Reserva el ancho del menú en pantallas anchas: 16rem expandido,
          4rem (riel de íconos) colapsado. En pantallas angostas queda
          oculto (el menú siempre se superpone ahí). */}
      <div
        aria-hidden="true"
        className={cn(
          "hidden shrink-0 transition-[width] duration-200 md:block",
          abierto ? "w-64" : "w-16"
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-3 border-b bg-card px-4 py-3">
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={abierto ? "Colapsar menú" : "Expandir menú"}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <span className="text-sm font-bold text-foreground md:hidden">
            Plataforma <span className="text-primary">Fabio Aguirre</span>
          </span>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="hidden min-w-0 md:block">
              <Breadcrumbs items={breadcrumbs} />
            </div>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}

function Sidebar({
  usuario,
  abierto,
  onCerrar,
}: {
  usuario: Usuario;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const pathname = usePathname();
  const enlaces = NAV_POR_ROL[usuario.rol as RolConocido] ?? [];
  const inicioHref = enlaces[0]?.href ?? "/dashboard";
  const etiquetaRol = ETIQUETA_ROL[usuario.rol as RolConocido] ?? usuario.rol;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-200",
        "w-64 md:translate-x-0",
        abierto ? "translate-x-0 md:w-64" : "-translate-x-full md:w-16"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-4",
          abierto ? "justify-between" : "md:justify-center md:px-2"
        )}
      >
        {/* Antes iba en una sola línea con `truncate`, que le cortaba
            "Fabio Aguirre" con puntos suspensivos porque no entraba junto
            con "Plataforma" en el ancho del panel. Se separa en dos líneas
            (rótulo + nombre) para que el nombre completo se vea siempre,
            sin depender del ancho disponible. Colapsado (solo en desktop,
            ver arriba) se reduce a las iniciales dentro de un círculo. */}
        <Link href={inicioHref} className="flex min-w-0 flex-col leading-tight">
          <span className={cn("text-xs font-medium text-muted-foreground", !abierto && "md:hidden")}>
            Plataforma
          </span>
          <span
            className={cn(
              "break-words text-base font-bold tracking-tight text-primary",
              !abierto &&
                "md:flex md:size-8 md:items-center md:justify-center md:rounded-full md:bg-primary/10 md:text-xs md:break-normal"
            )}
          >
            {abierto ? "Fabio Aguirre" : <span className="md:hidden">Fabio Aguirre</span>}
            {!abierto && <span className="hidden md:inline">FA</span>}
          </span>
        </Link>
        <button
          type="button"
          onClick={onCerrar}
          className={cn("shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground", !abierto && "md:hidden")}
          aria-label="Cerrar menú"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <nav
        className={cn("flex-1 space-y-1 overflow-y-auto px-2 py-4", !abierto && "md:px-2")}
        aria-label="Navegación principal"
      >
        {enlaces.map((enlace) => {
          const activo =
            enlace.href === pathname ||
            (enlace.href !== inicioHref && pathname?.startsWith(`${enlace.href}/`));
          const Icono = enlace.icon;

          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              title={!abierto ? enlace.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                !abierto && "md:justify-center md:px-2",
                activo
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icono className="size-4 shrink-0" aria-hidden="true" />
              <span className={cn(!abierto && "md:hidden")}>{enlace.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={cn("space-y-3 border-t px-3 py-4", !abierto && "md:flex md:flex-col md:items-center md:px-2")}>
        <div className={cn("flex items-center gap-2", !abierto && "md:flex-col")}>
          <Avatar className={cn(!abierto && "md:size-8")} title={!abierto ? `${usuario.nombre} ${usuario.apellido}` : undefined}>
            <AvatarFallback>{iniciales(usuario.nombre, usuario.apellido)}</AvatarFallback>
          </Avatar>
          <div className={cn("min-w-0", !abierto && "md:hidden")}>
            {/* Antes truncaba con "..." en una sola línea; a pedido del
                docente, ahora el nombre completo se ve siempre, envolviendo
                en varias líneas si hace falta (el panel tiene ancho fijo de
                16rem, así que no desborda). */}
            <p className="text-sm font-medium break-words text-foreground">
              {usuario.nombre} {usuario.apellido}
            </p>
            <Badge variant="secondary">{etiquetaRol}</Badge>
          </div>
        </div>
        <div className={cn(!abierto && "md:hidden")}>
          <LogoutButton />
        </div>
        <div className={cn("hidden", !abierto && "md:block")}>
          <LogoutButton iconOnly />
        </div>
      </div>
    </aside>
  );
}
