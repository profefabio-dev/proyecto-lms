"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { StatusScreen } from "@/components/status-screen";
import { Button } from "@/components/ui/button";
import "./globals.css";

// Último recurso: se muestra solo si falla el propio layout raíz. Como
// reemplaza al layout, debe traer sus propias etiquetas <html> y <body>.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <StatusScreen
          icon={TriangleAlert}
          titulo="La plataforma no pudo cargar"
          descripcion="Ocurrió un error inesperado. Intenta de nuevo en unos segundos."
        >
          <Button type="button" onClick={() => retry()}>
            Intentar de nuevo
          </Button>
        </StatusScreen>
      </body>
    </html>
  );
}
