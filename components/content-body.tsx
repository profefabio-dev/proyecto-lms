import { ExternalLink, Link2 } from "lucide-react";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { MarkdownContent } from "@/components/markdown-content";
import { DocumentContentList } from "@/components/document-content-list";
import { separarCodigo } from "@/lib/code-content";
import type { TipoContenidoConIcono } from "@/lib/content-type-icon";
import { Badge } from "@/components/ui/badge";

type DocumentoConUrl = { id: string; nombre: string; tipo: string; url: string | null };

/**
 * US45 — el cuerpo de un contenido, según su tipo.
 *
 * Antes este `switch` estaba escrito cuatro veces: dos en la página del
 * Tutor (contenido con sección y sin sección) y una en cada página del
 * Estudiante. Agregar ENLACE y CODIGO habría significado tocar los cuatro
 * lugares y arriesgarse a que uno quedara distinto, así que primero se
 * unificó acá.
 *
 * Server Component: nada de esto es interactivo.
 */
export function ContentBody({
  tipo,
  titulo,
  contenido,
  documentos = [],
}: {
  tipo: TipoContenidoConIcono;
  titulo: string;
  contenido: string;
  documentos?: DocumentoConUrl[];
}) {
  if (tipo === "VIDEO") {
    return <YoutubeEmbed url={contenido} titulo={titulo} />;
  }

  if (tipo === "TEXTO") {
    return <MarkdownContent contenido={contenido} />;
  }

  if (tipo === "DOCUMENTO") {
    return <DocumentContentList documentos={documentos} />;
  }

  if (tipo === "ENLACE") {
    return <EnlaceExterno url={contenido} titulo={titulo} />;
  }

  return <BloqueDeCodigo contenido={contenido} />;
}

/**
 * Un recurso externo se presenta como una ficha con su dominio a la vista y
 * se abre en otra pestaña: el estudiante sabe a dónde va antes de hacer
 * clic y no pierde el curso al volver. `rel="noreferrer"` evita filtrarle
 * al sitio de destino desde dónde llegó el estudiante.
 */
function EnlaceExterno({ url, titulo }: { url: string; titulo: string }) {
  let dominio = url;

  try {
    dominio = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // Una URL inválida no debería llegar acá (la Server Action la valida),
    // pero si llega, se muestra tal cual en vez de romper la página.
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-wrap items-center gap-4 rounded-2xl border border-border/80 bg-muted/30 p-5 transition-colors hover:border-primary/40 hover:bg-muted/60"
    >
      <span
        className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-duo-gold text-white shadow-xs"
        aria-hidden="true"
      >
        <Link2 className="size-6" />
      </span>

      <span className="min-w-0 flex-1 space-y-1">
        <span className="block font-heading text-base font-bold text-foreground transition-colors group-hover:text-primary">
          Abrir {titulo}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{dominio}</span>
      </span>

      <Badge variant="outline" className="gap-1 text-xs font-semibold">
        <ExternalLink className="size-3" aria-hidden="true" />
        Se abre en otra pestaña
      </Badge>
    </a>
  );
}

/**
 * Un fragmento de código, en monoespaciado y con scroll horizontal propio
 * (sin `break-word`: cortar una línea de código a la mitad cambia lo que
 * dice). No se colorea la sintaxis: traer un resaltador sumaría un paquete
 * grande al cliente por un detalle estético, y para fragmentos de clase el
 * monoespaciado con la etiqueta del lenguaje alcanza.
 */
function BloqueDeCodigo({ contenido }: { contenido: string }) {
  const { lenguaje, codigo } = separarCodigo(contenido);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/50 px-4 py-2">
        <span className="font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {lenguaje ?? "código"}
        </span>
      </div>
      <pre className="overflow-x-auto bg-sidebar p-4 text-sm leading-relaxed text-sidebar-foreground">
        <code className="font-mono">{codigo}</code>
      </pre>
    </div>
  );
}
