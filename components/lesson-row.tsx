import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICONO_POR_TIPO, type TipoContenidoConIcono } from "@/lib/content-type-icon";

/**
 * US43 — una lección en el temario del curso.
 *
 * Es la pieza que cambia la sensación de la pantalla: antes cada contenido
 * era una tarjeta enorme con el video o el texto completo dentro, y el curso
 * entero era un scroll interminable (el docente: "es muy básico", "es lo
 * mismo"). Ahora el temario es una lista de filas compactas y clicables —
 * se ve el curso completo de un vistazo, con los visto-bueno verdes de lo
 * ya completado — y el contenido se abre en el reproductor.
 */
export function LessonRow({
  href,
  numero,
  titulo,
  descripcion,
  tipo,
  visto,
}: {
  href: string;
  numero: number;
  titulo: string;
  descripcion: string | null;
  tipo: TipoContenidoConIcono;
  visto: boolean;
}) {
  const { Icon, clase, etiqueta } = ICONO_POR_TIPO[tipo];

  return (
    <li>
      <Link
        href={href}
        className="group flex min-h-16 items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
      >
        <span
          className={cn(
            // OP09 (21/11/2026): el chulo de "completada" era verde vivo y
            // pesaba mas que la leccion que sigue. Pasa a un verde apagado:
            // se sigue leyendo como logro, deja de competir.
            "flex size-11 shrink-0 items-center justify-center rounded-xl shadow-xs",
            visto ? "bg-success/15 text-success" : clase
          )}
          aria-hidden="true"
        >
          {visto ? <Check className="size-5" /> : <Icon className="size-5" />}
        </span>

        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              Lección {numero} · {etiqueta}
            </span>
            {/* OP09: en gris. El chulo ya dio la senal; repetirla en verde
                era el tercer verde de la misma fila. */}
            {visto && (
              <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                Completada
              </span>
            )}
          </span>
          <span className="block truncate font-heading text-base font-bold text-foreground transition-colors group-hover:text-primary">
            {titulo}
          </span>
          {descripcion && (
            <span className="block truncate text-xs text-muted-foreground">{descripcion}</span>
          )}
        </span>

        <ChevronRight
          className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}
