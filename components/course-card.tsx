import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CelebrationBadge } from "@/components/celebration-badge";
import { cn } from "@/lib/utils";

// Paleta de portadas cuando el curso no tiene imagen propia: antes era un
// gris plano con un ícono de "sin imagen", que es exactamente lo que hacía
// sentir el panel "básico" (feedback del docente, 2026-09-04). Ahora cada
// tarjeta sin imagen recibe un degradado vivo de la paleta de gamificación,
// rotando en el mismo orden que los cursos — no es aleatorio, así que la
// portada de un curso no "salta" de color entre una carga de página y otra.
const PORTADAS_DEGRADADO = [
  "from-duo-blue to-duo-green",
  "from-duo-orange to-duo-gold",
  "from-duo-green to-duo-blue",
  "from-primary to-duo-blue",
];

function varianteEstado(label: string): "success" | "warning" | "secondary" {
  if (label === "Activo") return "success";
  if (label === "Borrador") return "warning";
  return "secondary";
}

// Server Component a propósito (sin "use client"): la única parte de esta
// tarjeta que necesita JavaScript en el navegador es el confeti de la
// insignia de completado, aislado en `CelebrationBadge`. El resto —
// imagen/degradado, título, badge de estado, barra de progreso, animación
// de entrada y el efecto hover del texto "Continuar" — es HTML/CSS puro,
// así que no manda ni un byte de JavaScript de hidratación por tarjeta
// (pase de optimización de rendimiento, 2026-09-04).
export function CourseCard({
  href,
  index,
  titulo,
  imagen,
  tutor,
  estadoLabel,
  progreso,
  contenidosVistos,
  totalContenidos,
  completado,
}: {
  href: string;
  index: number;
  titulo: string;
  imagen: string | null;
  tutor: { nombre: string; apellido: string } | null;
  estadoLabel: string;
  progreso: number;
  contenidosVistos: number;
  totalContenidos: number;
  completado: boolean;
}) {
  return (
    <Link
      href={href}
      className="group/course-card block rounded-3xl outline-none animate-in fade-in slide-in-from-bottom-4 fill-mode-both focus-visible:ring-3 focus-visible:ring-ring/50"
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms`, animationDuration: "450ms" }}
    >
      <Card className="h-full overflow-hidden rounded-3xl py-0 shadow-sm transition-all duration-200 group-hover/course-card:-translate-y-1 group-hover/course-card:shadow-lg">
        {imagen ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria provista por el tutor
          <img
            src={imagen}
            alt=""
            className="aspect-video w-full object-cover"
            // Solo las primeras tarjetas (probablemente sobre el pliegue en
            // la mayoría de anchos de pantalla) cargan de inmediato; el
            // resto espera a acercarse al viewport — menos peso de red en
            // la carga inicial cuando hay muchos cursos.
            loading={index < 3 ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          <div
            className={cn(
              "flex aspect-video w-full items-center justify-center bg-gradient-to-br",
              PORTADAS_DEGRADADO[index % PORTADAS_DEGRADADO.length]
            )}
          >
            <BookOpen className="size-10 text-white/90" aria-hidden="true" />
          </div>
        )}
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-balance text-lg">{titulo}</CardTitle>
            {completado ? (
              <CelebrationBadge href={href} />
            ) : (
              <Badge variant={varianteEstado(estadoLabel)}>{estadoLabel}</Badge>
            )}
          </div>
          {tutor && (
            <p className="text-xs text-muted-foreground">
              {tutor.nombre} {tutor.apellido}
            </p>
          )}
        </CardHeader>
        <CardContent className="pb-(--card-spacing)">
          <Progress
            value={progreso}
            variant={completado ? "success" : "default"}
            size="lg"
            aria-label={`Avance del curso ${titulo}`}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {progreso}% · {contenidosVistos}/{totalContenidos} contenidos
            </p>
            <span className="flex items-center gap-0.5 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover/course-card:opacity-100">
              Continuar
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
