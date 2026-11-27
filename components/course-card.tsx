import Link from "next/link";
import { ArrowRight, BookOpen, User, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CelebrationBadge } from "@/components/celebration-badge";
import { cn } from "@/lib/utils";

// Color de portada cuando el curso no tiene imagen propia.
//
// 27/11/2026: eran cuatro **degradados**. La regla 4 de `DESIGN.md` pasó a
// valer en las pantallas de trabajo, y "Mis cursos" es una de ellas, así que
// quedan planos. Los colores `duo-*` sobreviven acá porque sustituyen una
// imagen que falta, que es ilustración y no decoración de interfaz — el uso
// que la regla 1 les deja, junto con la racha y el confeti.
const PORTADAS = [
  "bg-indigo-600",
  "bg-duo-orange",
  "bg-duo-green",
  "bg-primary",
];

function varianteEstado(label: string): "success" | "warning" | "secondary" {
  if (label === "Activo") return "success";
  if (label === "Borrador") return "warning";
  return "secondary";
}

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
      className="group/course-card block rounded-2xl outline-none animate-in fade-in slide-in-from-bottom-4 fill-mode-both focus-visible:ring-3 focus-visible:ring-ring/50"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms`, animationDuration: "400ms" }}
    >
      <Card className="h-full overflow-hidden rounded-2xl py-0 border border-border/80 shadow-xs transition-all duration-300 group-hover/course-card:-translate-y-1.5 group-hover/course-card:border-primary/40 group-hover/course-card:shadow-lg">
        {/* Encabezado visual con imagen o degradado temático */}
        <div className="relative overflow-hidden aspect-video w-full">
          {imagen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagen}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover/course-card:scale-105"
              loading={index < 3 ? "eager" : "lazy"}
              decoding="async"
            />
          ) : (
            <div
              className={cn(
                "flex h-full w-full items-center justify-center transition-transform duration-500 group-hover/course-card:scale-105",
                PORTADAS[index % PORTADAS.length]
              )}
            >
              <BookOpen className="size-11 text-white/90 drop-shadow-sm" aria-hidden="true" />
            </div>
          )}

          {/* Badge de completado o estado flotante sobre la imagen */}
          <div className="absolute top-3 right-3 z-10">
            {completado ? (
              <CelebrationBadge href={href} />
            ) : (
              <Badge
                variant={varianteEstado(estadoLabel)}
                className="backdrop-blur-md shadow-xs font-semibold"
              >
                {estadoLabel}
              </Badge>
            )}
          </div>

          {/* Indicador de porcentaje si ya tiene avance */}
          {progreso > 0 && !completado && (
            <div className="absolute bottom-3 left-3 z-10">
              <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                {progreso}% completado
              </span>
            </div>
          )}
        </div>

        <CardHeader className="pt-4 pb-2 px-5">
          <CardTitle className="text-balance font-heading text-base font-bold text-foreground group-hover/course-card:text-primary transition-colors line-clamp-2">
            {titulo}
          </CardTitle>
          {tutor && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <User className="size-3.5 text-muted-foreground/70" />
              <span>
                {tutor.nombre} {tutor.apellido}
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="px-5 pb-5 pt-2 flex flex-col gap-3 mt-auto">
          <div className="space-y-1.5">
            <Progress
              value={progreso}
              variant={completado ? "success" : "default"}
              size="default"
              aria-label={`Avance del curso ${titulo}`}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>
                {contenidosVistos} de {totalContenidos} {totalContenidos === 1 ? "tema" : "temas"}
              </span>
              {completado ? (
                <span className="flex items-center gap-1 text-success font-bold">
                  <CheckCircle2 className="size-3.5" />
                  Completado
                </span>
              ) : (
                <span className="font-semibold text-foreground">{progreso}%</span>
              )}
            </div>
          </div>

          {/* Botón interactivo al hacer hover */}
          <div className="border-t border-border/50 pt-3 flex items-center justify-between text-xs font-semibold text-primary">
            <span>{completado ? "Repasar contenido" : "Continuar lecciones"}</span>
            <span className="flex items-center gap-1 transition-transform group-hover/course-card:translate-x-1">
              Ingresar
              <ArrowRight className="size-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
