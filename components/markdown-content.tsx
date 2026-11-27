import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Lightbulb } from "lucide-react";

/**
 * Renderiza contenido de tipo TEXTO (US10). El Tutor escribe en Markdown
 * (títulos con "#", listas con "-", negrita con "**texto**") y aquí se
 * convierte a elementos React reales — nunca HTML crudo — para no abrir
 * una vía de XSS con contenido guardado por un Tutor.
 *
 * **Reescrito el 27/11/2026**, a partir de una lección real que el docente
 * fotografió: *"este tipo de contenidos de texto son muy básicos, sencillos
 * y planos"*. Tenía razón, y había además un error de fondo.
 *
 * **El error:** faltaba `remark-gfm`. Sin ese complemento, `react-markdown`
 * no entiende **tablas**, ni tachado, ni listas de tareas, ni autoenlaces —
 * la tabla de la lección se veía como un montón de barras verticales en
 * crudo. Era lo primero que saltaba a la vista en la captura.
 *
 * **Lo plano venía de tres decisiones viejas:**
 *
 *   · El cuerpo se pintaba con `text-muted-foreground`, el color del texto
 *     **secundario**. Es correcto para una fecha al pie de una tarjeta y es
 *     exactamente lo contrario de lo que necesita una lección: lo que se
 *     está leyendo es el dato principal de la pantalla. Ahora va en
 *     `foreground`, y el gris queda para lo accesorio.
 *   · No había estilo para `code`, `pre`, `blockquote`, `table`, enlaces ni
 *     imágenes: todo caía en el estilo por omisión del navegador, que en
 *     fondo oscuro es texto suelto sin superficie.
 *   · Las listas usaban `list-inside`, que al pasar de renglón alinea la
 *     segunda línea debajo del número en vez de debajo del texto.
 *
 * **Y dos cosas que suman "ludismo" sin inventar sintaxis nueva**, para que
 * el docente no tenga que aprender nada: una **cita** (`> texto`) se
 * dibuja como una tarjeta de consejo con su ícono, y los **títulos de
 * sección** llevan una barra de acento a la izquierda. Son los dos recursos
 * que más cambian el aire de una lección larga, y se escriben con el
 * Markdown de siempre.
 *
 * Lo que sigue pendiente y es harina de otro costal (US56): bloques
 * propiamente interactivos —una pregunta rápida dentro de la lección, pasos
 * con ilustración, un "dato curioso"— y la tipografía con personalidad.
 * Eso no se arregla con CSS sobre Markdown.
 */
export function MarkdownContent({ contenido }: { contenido: string }) {
  return (
    <div className="space-y-5 text-[17px] leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1
              className="font-heading mt-2 text-3xl font-extrabold tracking-tight text-foreground"
              {...props}
            />
          ),
          // La barra de acento a la izquierda: separa las secciones de una
          // lección larga sin agregar una línea divisoria más.
          h2: (props) => (
            <h2
              className="font-heading mt-8 border-l-4 border-primary pl-3 text-2xl font-bold tracking-tight text-foreground"
              {...props}
            />
          ),
          h3: (props) => (
            <h3
              className="font-heading mt-6 text-xl font-bold tracking-tight text-foreground"
              {...props}
            />
          ),
          p: (props) => <p className="max-w-[68ch] text-foreground/90" {...props} />,
          // `list-outside` y no `list-inside`: al pasar de renglón, la
          // segunda línea se alinea con el texto y no debajo del número.
          ul: (props) => (
            <ul className="ml-5 list-outside list-disc space-y-2 marker:text-primary" {...props} />
          ),
          ol: (props) => (
            <ol
              className="ml-5 list-outside list-decimal space-y-2 marker:font-bold marker:text-primary"
              {...props}
            />
          ),
          li: (props) => <li className="max-w-[66ch] pl-1 text-foreground/90" {...props} />,
          strong: (props) => <strong className="font-bold text-foreground" {...props} />,
          em: (props) => <em className="text-foreground/90 italic" {...props} />,
          a: (props) => (
            <a
              className="font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          // Una cita se dibuja como tarjeta de consejo. Es el recurso que
          // más cambia el aire de una lección, y se escribe con "> ".
          blockquote: (props) => (
            <div className="flex gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <blockquote className="space-y-2 [&>p]:text-foreground/90" {...props} />
            </div>
          ),
          code: ({ className, ...props }) => {
            // `react-markdown` usa el mismo componente para el código de una
            // línea y para el de un bloque; el de bloque trae `language-*`.
            const enBloque = typeof className === "string" && className.includes("language-");

            return enBloque ? (
              <code className="font-mono text-sm text-foreground" {...props} />
            ) : (
              <code
                className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-primary"
                {...props}
              />
            );
          },
          pre: (props) => (
            <pre
              className="overflow-x-auto rounded-2xl border border-border/80 bg-muted/40 p-4 text-sm leading-relaxed"
              {...props}
            />
          ),
          // Las tablas: lo que no se veía sin `remark-gfm`.
          table: (props) => (
            <div className="overflow-x-auto rounded-2xl border border-border/80">
              <table className="w-full border-collapse text-left text-base" {...props} />
            </div>
          ),
          thead: (props) => <thead className="bg-muted/50" {...props} />,
          th: (props) => (
            <th
              className="border-b border-border/80 px-4 py-2.5 font-heading text-sm font-bold tracking-wide text-foreground uppercase"
              {...props}
            />
          ),
          td: (props) => (
            <td className="border-b border-border/40 px-4 py-2.5 text-foreground/90" {...props} />
          ),
          hr: () => <hr className="border-border/60" />,
          img: (props) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="rounded-2xl border border-border/80" alt={props.alt ?? ""} {...props} />
          ),
        }}
      >
        {contenido}
      </ReactMarkdown>
    </div>
  );
}
