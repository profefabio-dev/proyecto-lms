"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// No existía ninguna forma de cerrar sesión en la interfaz antes de este
// pase de diseño — se agrega junto con el header porque es donde
// naturalmente vive este control.
export function LogoutButton() {
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
      size="sm"
      onClick={handleClick}
      disabled={cargando}
    >
      <LogOut className="size-4" aria-hidden="true" />
      {cargando ? "Saliendo..." : "Cerrar sesión"}
    </Button>
  );
}
