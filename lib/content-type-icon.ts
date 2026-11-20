import { FileText, PlayCircle, Type as TypeIcon, Link2, Code2 } from "lucide-react";

/**
 * Ícono, color de acento y etiqueta legible por tipo de contenido, usado en
 * la fila del temario (`LessonRow`), en el temario lateral
 * (`LessonCurriculum`) y en la cabecera del reproductor — tres lugares que
 * antes tenían el mismo mapa copiado. Agregar un tipo de contenido nuevo
 * (o cambiarle el color) se hace solo acá.
 *
 * US45 (20/11/2026) agrega ENLACE y CODIGO; `etiqueta` se sumó al mapa en
 * la misma pasada, porque el nombre del enum ("CODIGO") no es lo que se le
 * muestra al estudiante ("Código").
 */
export const ICONO_POR_TIPO = {
  VIDEO: { Icon: PlayCircle, clase: "bg-duo-blue", etiqueta: "Video" },
  DOCUMENTO: { Icon: FileText, clase: "bg-duo-orange", etiqueta: "Documento" },
  TEXTO: { Icon: TypeIcon, clase: "bg-duo-green", etiqueta: "Lectura" },
  ENLACE: { Icon: Link2, clase: "bg-duo-gold", etiqueta: "Recurso externo" },
  CODIGO: { Icon: Code2, clase: "bg-sidebar", etiqueta: "Código" },
} as const;

export type TipoContenidoConIcono = keyof typeof ICONO_POR_TIPO;
