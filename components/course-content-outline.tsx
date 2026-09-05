import { Check, FileText, PlayCircle, Type as TypeIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const ICONO_POR_TIPO = {
  VIDEO: { Icon: PlayCircle, clase: "bg-duo-blue" },
  DOCUMENTO: { Icon: FileText, clase: "bg-duo-orange" },
  TEXTO: { Icon: TypeIcon, clase: "bg-duo-green" },
} as const;

type ItemIndice = {
  id: string;
  numero: number;
  titulo: string;
  tipo: keyof typeof ICONO_POR_TIPO;
  visto: boolean;
};

// US31, segunda vuelta (05/09/2026): la primera versión solo agregó una
// tarjeta de resumen ARRIBA de la lista, en el mismo contenedor angosto de
// siempre — el docente evaluador confirmó que "sigue desaprovechándose" el
// ancho de pantalla, con mucho espacio en blanco a los lados. Ensanchar las
// tarjetas de contenido hasta ocupar todo el ancho se ve incómodo de leer
// (líneas de texto demasiado largas), así que en vez de eso ese espacio
// lateral pasa a esta barra — resumen de avance + índice de navegación con
// enlaces internos — algo que un LMS de verdad pondría ahí (como el listado
// de secciones a la izquierda en Canvas, la referencia que compartió el
// docente), sin necesitar todavía el modelo de datos de secciones de US30.
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
    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-duo-blue text-lg font-extrabold text-white"
          aria-hidden="true"
        >
          {progreso}%
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-semibold">
            {vistos} de {total} vistos
          </p>
          <Progress
            value={progreso}
            variant={progreso === 100 ? "success" : "default"}
            size="lg"
            aria-label={`Avance del curso ${tituloCurso}`}
          />
        </div>
      </div>

      <nav aria-label="Índice del curso" className="space-y-1 border-t pt-4">
        <p className="px-1 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Contenido
        </p>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const { Icon, clase } = ICONO_POR_TIPO[item.tipo];

            return (
              <li key={item.id}>
                <a
                  href={`#contenido-${item.id}`}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-white",
                      item.visto ? "bg-duo-green" : clase
                    )}
                    aria-hidden="true"
                  >
                    {item.visto ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                  </span>
                  <span className={cn("min-w-0 truncate", item.visto && "text-muted-foreground")}>
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
