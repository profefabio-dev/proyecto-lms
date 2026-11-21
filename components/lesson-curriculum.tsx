import Link from "next/link";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ICONO_POR_TIPO, type TipoContenidoConIcono } from "@/lib/content-type-icon";

export type LeccionDelTemario = {
  id: string;
  numero: number;
  titulo: string;
  tipo: TipoContenidoConIcono;
  visto: boolean;
};

export type ModuloDelTemario = {
  /** Título de la sección, o `null` para el contenido suelto del curso. */
  titulo: string | null;
  esActual?: boolean;
  lecciones: LeccionDelTemario[];
};

/**
 * US43 — el temario que acompaña al reproductor de lecciones.
 *
 * Reemplaza a `CourseContentOutline`, que era un índice de anclas (`#id`)
 * dentro de la misma página larga: ahora cada lección es una página propia,
 * así que esto es navegación de verdad, con `<Link>`, y marca cuál se está
 * viendo. Es lo que hace que la pantalla se lea como un aula y no como un
 * artículo: el estudiante siempre ve dónde está, qué llevaba antes y cuánto
 * le queda.
 *
 * Server Component: todo es enlaces y clases, nada interactivo.
 */
export function LessonCurriculum({
  courseId,
  tituloCurso,
  progreso,
  vistos,
  total,
  modulos,
  leccionActualId,
}: {
  courseId: string;
  tituloCurso: string;
  progreso: number;
  vistos: number;
  total: number;
  modulos: ModuloDelTemario[];
  leccionActualId?: string;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
      {/* Resumen de avance */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold shadow-xs",
            progreso === 100 ? "bg-success text-background" : "bg-primary text-primary-foreground"
          )}
          aria-hidden="true"
        >
          {progreso}%
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-bold text-foreground">
            {vistos} de {total} {total === 1 ? "lección" : "lecciones"}
          </p>
          <Progress
            value={progreso}
            variant={progreso === 100 ? "success" : "default"}
            size="lg"
            aria-label={`Avance del curso ${tituloCurso}`}
          />
        </div>
      </div>

      <nav aria-label="Temario del curso" className="space-y-4 border-t border-border/60 pt-4">
        <Link
          href={`/estudiante/cursos/${courseId}`}
          className="block px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          Temario del curso
        </Link>

        {modulos.map((modulo, indiceModulo) => (
          <div key={modulo.titulo ?? `sueltos-${indiceModulo}`} className="space-y-1">
            <p className="flex items-center gap-2 px-1 text-xs font-bold text-foreground">
              {modulo.titulo ?? "Contenidos generales"}
              {modulo.esActual && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                  Actual
                </span>
              )}
            </p>

            <ul className="space-y-1">
              {modulo.lecciones.map((leccion) => {
                const { Icon, clase } = ICONO_POR_TIPO[leccion.tipo];
                const esActual = leccion.id === leccionActualId;

                return (
                  <li key={leccion.id}>
                    <Link
                      href={`/estudiante/cursos/${courseId}/lecciones/${leccion.id}`}
                      aria-current={esActual ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors",
                        esActual
                          ? "bg-primary/10 font-bold text-primary ring-1 ring-primary/30"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-lg shadow-xs",
                          leccion.visto ? "bg-success/15 text-success" : clase
                        )}
                        aria-hidden="true"
                      >
                        {leccion.visto ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Icon className="size-3.5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {leccion.numero}. {leccion.titulo}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
