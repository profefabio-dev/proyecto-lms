import ReactMarkdown from "react-markdown";

/**
 * Renderiza contenido de tipo TEXTO (US10). El Tutor escribe en Markdown
 * (títulos con "#", listas con "-", negrita con "**texto**") y aquí se
 * convierte a elementos React reales — nunca HTML crudo — para no abrir
 * una vía de XSS con contenido guardado por un Tutor.
 */
export function MarkdownContent({ contenido }: { contenido: string }) {
  return (
    <div className="space-y-2">
      <ReactMarkdown
        components={{
          h1: (props) => <h1 className="text-xl font-bold" {...props} />,
          h2: (props) => <h2 className="text-lg font-semibold" {...props} />,
          h3: (props) => <h3 className="text-base font-semibold" {...props} />,
          ul: (props) => <ul className="list-disc list-inside space-y-1" {...props} />,
          ol: (props) => <ol className="list-decimal list-inside space-y-1" {...props} />,
          strong: (props) => <strong className="font-semibold" {...props} />,
          p: (props) => <p className="text-sm text-gray-700" {...props} />,
        }}
      >
        {contenido}
      </ReactMarkdown>
    </div>
  );
}
