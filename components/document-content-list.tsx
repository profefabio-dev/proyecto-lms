import { FileText, Download } from "lucide-react";
import { esDocumentoPdf } from "@/lib/supabase/storage";

type DocumentoConUrl = {
  id: string;
  nombre: string;
  tipo: string;
  url: string | null;
};

export function DocumentContentList({ documentos }: { documentos: DocumentoConUrl[] }) {
  return (
    <ul className="space-y-6">
      {documentos.map((documento) => (
        <li key={documento.id} className="space-y-3">
          {documento.url ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">{documento.nombre}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {esDocumentoPdf(documento.tipo) ? "Documento PDF" : "Archivo descargable"}
                    </p>
                  </div>
                </div>

                <a
                  href={documento.url}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 shadow-xs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="size-4" />
                  <span>Descargar material</span>
                </a>
              </div>

              {esDocumentoPdf(documento.tipo) && (
                <iframe
                  src={documento.url}
                  title={`Previsualización de ${documento.nombre}`}
                  className="h-[850px] w-full rounded-2xl border border-border/80 shadow-xs"
                />
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {documento.nombre} (no se pudo generar el enlace de descarga)
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
