import ReactMarkdown from "react-markdown";

/**
 * Renderiza contenido de tipo TEXTO (US10). El Tutor escribe en Markdown
 * (títulos con "#", listas con "-", negrita con "**texto**") y aquí se
 * convierte a elementos React reales — nunca HTML crudo — para no abrir
 * una vía de XSS con contenido guardado por un Tutor.
 */
export function MarkdownContent({ contenido }: { contenido: string }) {
  return (
    // US31, cuarta vuelta (05/09/2026): otro escalón más de tamaño — el
    // docente pidió llevar las actividades todavía más allá de la vuelta
    // anterior.
    <div className="space-y-4">
      <ReactMarkdown
        components={{
          h1: (props) => <h1 className="text-3xl font-bold" {...props} />,
          h2: (props) => <h2 className="text-2xl font-semibold" {...props} />,
          h3: (props) => <h3 className="text-xl font-semibold" {...props} />,
          ul: (props) => <ul className="list-disc list-inside space-y-2 text-lg" {...props} />,
          ol: (props) => <ol className="list-decimal list-inside space-y-2 text-lg" {...props} />,
          strong: (props) => <strong className="font-semibold" {...props} />,
          p: (props) => <p className="text-lg text-muted-foreground" {...props} />,
        }}
      >
        {contenido}
      </ReactMarkdown>
    </div>
  );
}
