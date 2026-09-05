import { FileText, PlayCircle, Type as TypeIcon } from "lucide-react";

/**
 * Ícono y color de acento por tipo de contenido (VIDEO/DOCUMENTO/TEXTO),
 * usado tanto en la tarjeta de cada contenido (`CourseContentItem`) como en
 * el índice de navegación de la barra lateral (`CourseContentOutline`) —
 * ambos construidos el mismo día (US31, 05/09/2026) y que antes tenían este
 * mismo mapa copiado de forma idéntica en los dos archivos. Se consolida
 * aquí para que agregar un tipo de contenido nuevo (o cambiar su color) solo
 * requiera tocar un lugar.
 */
export const ICONO_POR_TIPO = {
  VIDEO: { Icon: PlayCircle, clase: "bg-duo-blue" },
  DOCUMENTO: { Icon: FileText, clase: "bg-duo-orange" },
  TEXTO: { Icon: TypeIcon, clase: "bg-duo-green" },
} as const;

export type TipoContenidoConIcono = keyof typeof ICONO_POR_TIPO;
