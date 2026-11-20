-- US45 — dos tipos de contenido más (20/11/2026).
--
-- Con VIDEO, TEXTO y DOCUMENTO, todos los cursos de la plataforma se veían
-- iguales: al sembrar un curso de prueba con todos los recursos
-- disponibles, el docente lo comparó con uno que ya tenía y dijo que era
-- "lo mismo". Estos dos agregan variedad real y no artificial:
--
-- - ENLACE: un recurso externo (una simulación, un artículo, una
--   herramienta en línea). Antes tocaba pegarlo dentro de un TEXTO como un
--   link suelto, sin ficha propia ni aviso de que se sale del sitio.
-- - CODIGO: un fragmento de código con su lenguaje. En un TEXTO en Markdown
--   perdía el formato y se mezclaba con la explicación.
--
-- "contenido" guarda la URL (ENLACE) o el código (CODIGO), igual que hoy
-- guarda la URL de YouTube o el Markdown; para CODIGO, el lenguaje va en la
-- primera línea con el prefijo "lenguaje:" (ver lib/code-content.ts), para
-- no agregar una columna que solo serviría a un tipo de contenido.
--
-- Agregar valores a un enum existente es una operación sin bloqueo y no
-- afecta a las filas ya guardadas: todo el contenido anterior conserva su
-- tipo.

ALTER TYPE "TipoContenido" ADD VALUE IF NOT EXISTS 'ENLACE';
ALTER TYPE "TipoContenido" ADD VALUE IF NOT EXISTS 'CODIGO';
