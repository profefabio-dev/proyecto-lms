import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ICONO_POR_TIPO, type TipoContenidoConIcono } from "@/lib/content-type-icon";

type ItemIndice = {
  id: string;
  numero: number;
  titulo: string;
  tipo: TipoContenidoConIcono;
  visto: boolean;
};

export function CourseContentOutline({
  tituloCurso,
  progreso,
  vistos,
  total,
  items,
}: {
  tituloCurso: string;
  progreso: number;
  vistos: number;
  total: number;
  items: ItemIndice[];
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
      {/* Resumen de progreso */}
      <div className="flex items-center gap-4">
        <div
          className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-duo-blue text-lg font-extrabold text-white shadow-xs"
          aria-hidden="true"
        >
          {progreso}%
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-bold text-foreground">
            {vistos} de {total} temas vistos
          </p>
          <Progress
            value={progreso}
            variant={progreso === 100 ? "success" : "default"}
            size="lg"
            aria-label={`Avance del curso ${tituloCurso}`}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {progreso === 100
          ? "¡Excelente trabajo! Has completado todas las lecciones publicadas."
          : "Confirma cada lección completada para avanzar en tu ruta de aprendizaje."}
      </p>

      {/* Lista de navegación interna */}
      <nav aria-label="Índice del curso" className="space-y-1 border-t border-border/60 pt-4">
        <p className="px-1 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Ruta de Lecciones
        </p>
        <ul className="space-y-1">
          {items.map((item) => {
            const { Icon, clase } = ICONO_POR_TIPO[item.tipo];

            return (
              <li key={item.id}>
                <a
                  href={`#contenido-${item.id}`}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted min-h-11 touch:min-h-11"
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-lg text-white shadow-xs",
                      item.visto ? "bg-duo-green" : clase
                    )}
                    aria-hidden="true"
                  >
                    {item.visto ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate", item.visto && "text-muted-foreground line-through opacity-80")}>
                    {item.numero}. {item.titulo}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
