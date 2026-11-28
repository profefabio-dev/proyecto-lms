import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

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
 * ---
 *
 * **US56, capa A (28/11/2026): las dos variantes.**
 *
 * Este componente lo usan seis pantallas, y no todas leen lo mismo. Una
 * lección se **lee**: párrafos largos, uno tras otro, diez minutos. Un
 * anuncio, la definición de un término del glosario, las instrucciones de
 * una actividad y el detalle de un reporte se **consultan**: tres renglones
 * dentro de una tarjeta. Darle a todas la tipografía de una lección sería
 * poner un anuncio de dos líneas en cuerpo 19 con serif, que se ve
 * desproporcionado.
 *
 * Por eso hay dos variantes, y la de siempre es la que no cambia:
 *
 *   · `"compacta"` (la de omisión): exactamente lo que había. Anuncios,
 *     glosario, instrucciones de actividad, detalle de un reporte.
 *   · `"lectura"`: el cuerpo en serif (`--font-lectura`), más grande, con
 *     más interlínea, medida de renglón más corta y el primer párrafo como
 *     entradilla. La usa el reproductor de lecciones.
 *
 * El ancho de renglón es lo que más se nota y lo menos vistoso: entre 60 y
 * 70 caracteres es lo que se lee sin perder el salto de línea, y una
 * pantalla de escritorio sin límite da el doble.
 *
 * **Lo que queda en serif y lo que no.** El cuerpo, los títulos de sección
 * y las listas, sí. La tarjeta de consejo y las tablas vuelven a la sans:
 * son apartes, no prosa, y en serif se confunden con el texto que las
 * rodea. El código ya estaba en monoespaciado y ahí se queda.
 *
 * Lo que sigue pendiente de US56: las capas B (bloques que el estudiante
 * *hace*) y C (lo lúdico). Eso no se arregla con CSS sobre Markdown.
 */
export function MarkdownContent({
  contenido,
  variante = "compacta",
}: {
  contenido: string;
  variante?: "compacta" | "lectura";
}) {
  const esLectura = variante === "lectura";

  return (
    <div
      className={cn(
        "text-foreground",
        esLectura
          ? "font-lectura space-y-6 text-[1.1875rem] leading-[1.8]"
          : "space-y-5 text-[17px] leading-relaxed"
      )}
    >
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
              className={cn(
                "font-heading border-l-4 border-primary pl-3 font-bold tracking-tight text-foreground",
                esLectura ? "mt-12 text-2xl sm:text-[1.75rem]" : "mt-8 text-2xl"
              )}
              {...props}
            />
          ),
          h3: (props) => (
            <h3
              className={cn(
                "font-heading text-xl font-bold tracking-tight text-foreground",
                esLectura ? "mt-8" : "mt-6"
              )}
              {...props}
            />
          ),
          // La entradilla: el primer párrafo de una lección entra más
          // grande. Es el recurso de cualquier revista para que una página
          // de texto tenga un punto de entrada en vez de empezar de golpe,
          // y no le pide nada al docente — es el párrafo que ya escribió.
          p: (props) => (
            <p
              className={cn(
                "text-foreground/90",
                esLectura
                  ? "max-w-[64ch] first-of-type:text-[1.3125rem] first-of-type:leading-[1.7] first-of-type:text-foreground"
                  : "max-w-[68ch]"
              )}
              {...props}
            />
          ),
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
          li: (props) => (
            <li
              className={cn("pl-1 text-foreground/90", esLectura ? "max-w-[62ch]" : "max-w-[66ch]")}
              {...props}
            />
          ),
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
            <div
              className={cn(
                "flex gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4",
                esLectura && "my-8 max-w-[64ch]"
              )}
            >
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <blockquote
                className={cn(
                  "space-y-2 [&>p]:text-foreground/90",
                  esLectura && "font-sans text-base leading-relaxed [&>p]:max-w-none"
                )}
                {...props}
              />
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
              className="overflow-x-auto rounded-2xl border border-border/80 bg-muted/40 p-4 text-sm leading-relaxed [&_code]:block [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-foreground"
              {...props}
            />
          ),
          // Las tablas: lo que no se veía sin `remark-gfm`.
          table: (props) => (
            <div className="overflow-x-auto rounded-2xl border border-border/80">
              <table
                className={cn(
                  "w-full border-collapse text-left text-base",
                  esLectura && "font-sans"
                )}
                {...props}
              />
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
          hr: () => <hr className={cn("border-border/60", esLectura && "my-10")} />,
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
