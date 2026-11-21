import { ExternalLink } from "lucide-react";
import { construirEmbedUrl, construirUrlWatch } from "@/lib/youtube";

export function YoutubeEmbed({ url, titulo }: { url: string; titulo: string }) {
  const embedUrl = construirEmbedUrl(url);
  const urlWatch = construirUrlWatch(url);

  if (!embedUrl) {
    // No debería pasar (la URL ya se valida al crear el contenido), pero
    // si el dato quedó corrupto no queremos tronar la página del curso.
    return (
      <p className="text-sm text-destructive">
        No se pudo cargar este video: el enlace guardado no es válido.
      </p>
    );
  }

  // US31, tercera vuelta (05/09/2026): el video quedaba encogido a 36rem
  // (`max-w-xl`) sin importar cuánto espacio real tuviera disponible la
  // tarjeta que lo contiene — a pedido del docente de agrandar las
  // actividades, ahora ocupa todo el ancho de su columna (la relación de
  // aspecto lo mantiene proporcional, nunca deforma el video).
  // El enlace de abajo no es decorativo (21/11/2026): hay videos cuyo dueño
  // prohíbe incrustarlos en otros sitios, y en esos el reproductor muestra
  // un "Error 153" en vez de la clase. Eso no se puede detectar desde aquí
  // —el iframe es de otro dominio y no nos cuenta qué le pasó—, así que la
  // salida siempre está visible y el estudiante nunca queda atascado.
  return (
    <div className="space-y-2">
      <div className="aspect-video w-full overflow-hidden rounded-lg border">
        <iframe
          src={embedUrl}
          title={titulo}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {urlWatch && (
        <a
          href={urlWatch}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          Si el video no carga, ábrelo en YouTube
        </a>
      )}
    </div>
  );
}
