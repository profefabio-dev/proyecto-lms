import { esDocumentoPdf } from "@/lib/supabase/storage";

type DocumentoConUrl = {
  id: string;
  nombre: string;
  tipo: string;
  url: string | null;
};

/**
 * US09/US16: lista de documentos de un contenido de tipo DOCUMENTO.
 * Cada documento siempre tiene su enlace de descarga (URL firmada, de
 * corta duración); si además es un PDF, se agrega una previsualización
 * embebida — los navegadores lo renderizan de forma nativa. Los
 * documentos Word no se pueden previsualizar en el navegador, así que
 * para esos solo queda el enlace de descarga.
 */
export function DocumentContentList({ documentos }: { documentos: DocumentoConUrl[] }) {
  return (
    <ul className="space-y-5">
      {documentos.map((documento) => (
        <li key={documento.id} className="space-y-2.5">
          {documento.url ? (
            <>
              <a
                href={documento.url}
                className="text-lg font-medium text-blue-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {documento.nombre}
              </a>
              {esDocumentoPdf(documento.tipo) && (
                // US31, cuarta vuelta (05/09/2026): otro escalón más de
                // tamaño (antes 700px de alto, antes de eso 500px).
                <iframe
                  src={documento.url}
                  title={`Previsualización de ${documento.nombre}`}
                  className="h-[850px] w-full rounded border"
                />
              )}
            </>
          ) : (
            <p className="text-base text-muted-foreground">
              {documento.nombre} (no se pudo generar el enlace de descarga)
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
