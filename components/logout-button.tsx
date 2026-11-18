"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// No existía ninguna forma de cerrar sesión en la interfaz antes de este
// pase de diseño — se agrega junto con el header porque es donde
// naturalmente vive este control.
export function LogoutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function handleClick() {
    setCargando(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      // Paquete 3 de interfaz (2026-11-12): este botón solo vive dentro del
      // menú lateral OSCURO (`AppShell`), pero la variante `outline` pinta un
      // fondo claro (`bg-background`) con el texto heredado del menú (también
      // claro) — quedaba casi invisible, y colapsado era un cuadro blanco sin
      // icono legible. Se sobrescribe con los colores propios del menú.
      className="border-sidebar-border bg-transparent text-sidebar-foreground shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:border-sidebar-border dark:bg-transparent dark:hover:bg-sidebar-accent"
      size={iconOnly ? "icon-sm" : "sm"}
      onClick={handleClick}
      disabled={cargando}
      title={iconOnly ? (cargando ? "Saliendo..." : "Cerrar sesión") : undefined}
      aria-label={iconOnly ? "Cerrar sesión" : undefined}
    >
      <LogOut className="size-4" aria-hidden="true" />
      {!iconOnly && (cargando ? "Saliendo..." : "Cerrar sesión")}
    </Button>
  );
}
