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
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RolConocido = "ADMINISTRADOR" | "TUTOR" | "ESTUDIANTE";
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
};

const ETIQUETA_ROL: Record<RolConocido, string> = {
  ADMINISTRADOR: "Administrador",
  TUTOR: "Tutor",
  ESTUDIANTE: "Estudiante",
};

/**
 * Shell de las tres áreas protegidas de la plataforma (Admin/Tutor/
 * Estudiante). Reemplaza el header horizontal del primer pase de diseño
 * por un menú lateral izquierdo desplegable, a pedido explícito del
 * docente, para que se vea más como un LMS tradicional (Blackboard/Moodle)
 * que como un sitio genérico. El menú se abre/cierra con el botón de
 * hamburguesa: en pantallas anchas (md+) el contenido se corre a la
 * derecha cuando está abierto (menú persistente, como en un LMS); en
 * pantallas angostas se superpone como un panel con fondo oscurecido
 * detrás, ya que no hay espacio para correr el contenido. Recibe el
 * usuario ya resuelto por la página (todas las páginas protegidas ya
 * hacen esa consulta para su propia guarda de sesión/rol), así que no
 * repite ninguna consulta a la base de datos.
 */
export function AppShell({
  usuario,
  children,
}: {
  usuario: Usuario;
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

      {/* Reserva el ancho del menú en pantallas anchas cuando está abierto,
          para que el contenido se corra en vez de quedar tapado. En
          pantallas angostas queda oculto (el menú siempre se superpone ahí). */}
      <div
        aria-hidden="true"
        className={cn(
          "hidden shrink-0 transition-[width] duration-200 md:block",
          abierto ? "w-64" : "w-0"
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={abierto ? "Ocultar menú" : "Mostrar menú"}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <span className="text-sm font-bold text-foreground md:hidden">
            Plataforma <span className="text-primary">Fabio Aguirre</span>
          </span>
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
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200",
        abierto ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-4 py-4">
        <Link
          href={inicioHref}
          className="truncate text-base font-bold tracking-tight text-foreground"
        >
          Plataforma <span className="text-primary">Fabio Aguirre</span>
        </Link>
        <button
          type="button"
          onClick={onCerrar}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Cerrar menú"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label="Navegación principal">
        {enlaces.map((enlace) => {
          const activo =
            enlace.href === pathname ||
            (enlace.href !== inicioHref && pathname?.startsWith(`${enlace.href}/`));
          const Icono = enlace.icon;

          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activo
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icono className="size-4 shrink-0" aria-hidden="true" />
              {enlace.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t px-3 py-4">
        <div>
          {/* Antes truncaba con "..." en una sola línea; a pedido del
              docente, ahora el nombre completo se ve siempre, envolviendo
              en varias líneas si hace falta (el panel tiene ancho fijo de
              16rem, así que no desborda). */}
          <p className="text-sm font-medium break-words text-foreground">
            {usuario.nombre} {usuario.apellido}
          </p>
          <Badge variant="secondary">{etiquetaRol}</Badge>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
