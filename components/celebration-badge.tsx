"use client";

import { useEffect, useRef } from "react";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Pieza mínima de cliente para la insignia de curso completado: solo esto
 * necesita JavaScript en el navegador (el confeti de celebración), así que
 * se separó de `CourseCard` a propósito — antes toda la tarjeta era
 * "use client" solo por este detalle, lo que mandaba al navegador el
 * JavaScript de hidratación de la tarjeta entera (imagen, título, badge de
 * estado, barra de progreso) aunque nada de eso necesite interactividad.
 * Con esta separación, `CourseCard` vuelve a ser un Server Component — cero
 * JavaScript por tarjeta salvo, quizás, esta insignia puntual en las que
 * están completadas. Pase de optimización de rendimiento, 2026-09-04.
 */
export function CelebrationBadge({ href }: { href: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Confeti una sola vez por navegador, no en cada carga de página.
    const clave = `curso-celebrado:${href}`;
    if (sessionStorage.getItem(clave)) return;
    sessionStorage.setItem(clave, "1");

    let cancelado = false;
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelado || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      confetti({
        particleCount: 60,
        spread: 70,
        startVelocity: 35,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
        colors: ["#58cc02", "#ffc800", "#1cb0f6", "#ff9600"],
      });
    });
    return () => {
      cancelado = true;
    };
  }, [href]);

  return (
    <span ref={ref} className="shrink-0">
      <Badge variant="achievement">
        <Trophy className="size-3.5" aria-hidden="true" />
        Completado
      </Badge>
    </span>
  );
}
