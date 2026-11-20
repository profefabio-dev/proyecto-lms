/**
 * US45 — lenguaje y cuerpo de un contenido de tipo CODIGO.
 *
 * `Contents.contenido` es una sola columna de texto compartida por todos
 * los tipos (guarda la URL de YouTube, el Markdown, la ruta del documento),
 * y un fragmento de código necesita además saber en qué lenguaje está. En
 * vez de agregar una columna que solo le serviría a un tipo, el lenguaje va
 * en la primera línea con el prefijo `lenguaje:`, igual que un encabezado:
 *
 *     lenguaje: python
 *     print("hola")
 *
 * Si no viene ese encabezado, el contenido entero es el código y el
 * lenguaje queda sin especificar — así el formato es compatible con
 * cualquier texto pegado a mano.
 */
const PREFIJO = "lenguaje:";

export function componerCodigo(lenguaje: string, codigo: string): string {
  const limpio = lenguaje.trim();
  return limpio ? `${PREFIJO} ${limpio}\n${codigo}` : codigo;
}

export function separarCodigo(contenido: string): { lenguaje: string | null; codigo: string } {
  const salto = contenido.indexOf("\n");
  const primeraLinea = (salto === -1 ? contenido : contenido.slice(0, salto)).trim();

  if (!primeraLinea.toLowerCase().startsWith(PREFIJO)) {
    return { lenguaje: null, codigo: contenido };
  }

  const lenguaje = primeraLinea.slice(PREFIJO.length).trim();

  return {
    lenguaje: lenguaje || null,
    codigo: salto === -1 ? "" : contenido.slice(salto + 1),
  };
}
