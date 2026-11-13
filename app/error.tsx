"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { StatusScreen } from "@/components/status-screen";
import { Button, buttonVariants } from "@/components/ui/button";

// Error inesperado en cualquier página. A propósito no se muestra
// `error.message` al usuario (puede traer detalles internos); solo se
// registra en la consola.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      icon={TriangleAlert}
      titulo="Algo salió mal"
      descripcion="Ocurrió un error inesperado. Intenta de nuevo; si sigue pasando, avísale a tu docente."
    >
      <Button type="button" onClick={() => retry()}>
        Intentar de nuevo
      </Button>
      <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
        Ir al inicio
      </Link>
    </StatusScreen>
  );
}
