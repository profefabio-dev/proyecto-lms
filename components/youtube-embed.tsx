import { construirEmbedUrl } from "@/lib/youtube";

export function YoutubeEmbed({ url, titulo }: { url: string; titulo: string }) {
  const embedUrl = construirEmbedUrl(url);

  if (!embedUrl) {
    // No debería pasar (la URL ya se valida al crear el contenido), pero
    // si el dato quedó corrupto no queremos tronar la página del curso.
    return (
      <p className="text-sm text-red-600">
        No se pudo cargar este video: el enlace guardado no es válido.
      </p>
    );
  }

  // US31, tercera vuelta (05/09/2026): el video quedaba encogido a 36rem
  // (`max-w-xl`) sin importar cuánto espacio real tuviera disponible la
  // tarjeta que lo contiene — a pedido del docente de agrandar las
  // actividades, ahora ocupa todo el ancho de su columna (la relación de
  // aspecto lo mantiene proporcional, nunca deforma el video).
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border">
      <iframe
        src={embedUrl}
        title={titulo}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
