-- US54 (27/11/2026): el glosario del curso.
--
-- Quinta y última idea tomada de revisar la plataforma del colegio del
-- docente (AVACOM, que es Chamilo), donde el glosario es una herramienta
-- propia de cada curso. Aquí no existía, y para esta materia no es un
-- adorno: en Tecnología e Informática con chicos de 10 a 18 años **el
-- vocabulario es la materia**. "Algoritmo", "variable", "protoboard",
-- "consulta SQL" son el contenido, no palabras sueltas que lo acompañan, y
-- hasta hoy cada docente las explicaba suelto en el texto de una lección —
-- donde el estudiante que las olvidó dos semanas después no sabe dónde
-- buscarlas.
--
-- `definicion` va en Markdown, como las instrucciones de una actividad
-- (US36), el contenido de tipo texto (US10) y el cuerpo de un anuncio
-- (US53), y se renderiza con `MarkdownContent` — nunca como HTML crudo, que
-- con texto escrito por un Tutor sería una vía de XSS.
--
-- **No hay columna `orden`.** Un glosario se consulta, no se recorre: el
-- orden es alfabético y lo pone la pantalla. Una columna de orden manual
-- obligaría al docente a mantener a mano algo que el abecedario ya resuelve,
-- y es justo lo contrario de lo que pasa con las lecciones (US12) o las
-- secciones (US30), donde la secuencia **es** la decisión pedagógica.
--
-- **Único por curso y término.** Dos definiciones del mismo término en el
-- mismo curso son un error de dedo, no un caso de uso. La restricción es
-- sobre el texto tal cual se escribió; que "Algoritmo" y "algoritmo" sean el
-- mismo término lo comprueba la acción antes de insertar (ver
-- `lib/glosario.ts`), porque eso depende de acentos y mayúsculas y conviene
-- tenerlo probado y no enterrado en una colación de Postgres.
CREATE TABLE "glosario" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "termino" TEXT NOT NULL,
    "definicion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "glosario_pkey" PRIMARY KEY ("id")
);

-- El listado siempre es "los términos de este curso".
CREATE INDEX "glosario_courseId_idx" ON "glosario" ("courseId");

-- Dos veces el mismo término en el mismo curso es un error de dedo.
CREATE UNIQUE INDEX "glosario_courseId_termino_key" ON "glosario" ("courseId", "termino");

-- AddForeignKey
ALTER TABLE "glosario" ADD CONSTRAINT "glosario_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, igual que en las migraciones 20261112200000,
-- 20261119040000, 20261120040000 y 20261125060000: una tabla de "public" sin
-- RLS se puede leer y modificar desde internet con la clave pública del
-- proyecto a través de la Data API de Supabase. Se activa sin crear
-- políticas — la aplicación entra con Prisma y con service_role, que no
-- pasan por RLS, así que para ella no cambia nada.
ALTER TABLE "public"."glosario" ENABLE ROW LEVEL SECURITY;
