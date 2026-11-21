import { FileText, PlayCircle, Type as TypeIcon, Link2, Code2 } from "lucide-react";

/**
 * Ícono y etiqueta legible por tipo de contenido, usado en la fila del
 * temario (`LessonRow`), en el temario lateral (`LessonCurriculum`) y en la
 * cabecera del reproductor — tres lugares que antes tenían el mismo mapa
 * copiado. Agregar un tipo nuevo se hace solo acá.
 *
 * OP09 (21/11/2026) — **se quitó el color por tipo**. Cada tipo traía su
 * propio color de acento (video azul, documento naranja, texto verde,
 * enlace dorado), y con cinco tipos eso eran cinco colores compitiendo en
 * una misma lista contra el índigo de marca. El docente lo vio en pantalla:
 * el ojo iba a los colores, no a la lección que sigue. Ahora **el tipo lo
 * dice el ícono y nada más** (regla 3 de `DESIGN.md`), y el color queda
 * libre para señalar una sola cosa: dónde vas.
 *
 * `clase` se conserva como la clase de superficie neutra del chip, para no
 * tener que tocar los tres componentes que la leen.
 */
export const ICONO_POR_TIPO = {
  VIDEO: { Icon: PlayCircle, clase: "bg-muted text-muted-foreground", etiqueta: "Video" },
  DOCUMENTO: { Icon: FileText, clase: "bg-muted text-muted-foreground", etiqueta: "Documento" },
  TEXTO: { Icon: TypeIcon, clase: "bg-muted text-muted-foreground", etiqueta: "Lectura" },
  ENLACE: { Icon: Link2, clase: "bg-muted text-muted-foreground", etiqueta: "Recurso externo" },
  CODIGO: { Icon: Code2, clase: "bg-muted text-muted-foreground", etiqueta: "Código" },
} as const;

export type TipoContenidoConIcono = keyof typeof ICONO_POR_TIPO;
