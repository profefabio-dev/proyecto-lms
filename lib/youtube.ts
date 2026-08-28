/**
 * Utilidades para trabajar con URLs de YouTube (US08).
 *
 * Solo maneja los formatos de enlace más comunes:
 *   - https://www.youtube.com/watch?v=VIDEOID
 *   - https://youtu.be/VIDEOID
 *   - https://www.youtube.com/embed/VIDEOID
 *   - https://www.youtube.com/shorts/VIDEOID
 */

const ID_VALIDO = /^[a-zA-Z0-9_-]{6,}$/;

export function extraerYoutubeId(url: string): string | null {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  let id: string | null = null;

  if (host === "youtu.be") {
    id = parsed.pathname.slice(1);
  } else if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch") {
      id = parsed.searchParams.get("v");
    } else if (parsed.pathname.startsWith("/embed/")) {
      id = parsed.pathname.slice("/embed/".length);
    } else if (parsed.pathname.startsWith("/shorts/")) {
      id = parsed.pathname.slice("/shorts/".length);
    }
  }

  if (!id) return null;

  // Cortamos cualquier segmento extra en la ruta (ej. /embed/ID/extra).
  id = id.split("/")[0];

  return ID_VALIDO.test(id) ? id : null;
}

export function esUrlDeYoutubeValida(url: string): boolean {
  return extraerYoutubeId(url) !== null;
}

export function construirEmbedUrl(url: string): string | null {
  const id = extraerYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
