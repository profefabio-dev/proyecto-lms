-- US53 (25/11/2026): los anuncios del docente en un curso.
--
-- Tercera idea tomada de revisar la plataforma del colegio (Chamilo), que
-- tiene "Anuncios" como herramienta propia del curso. Aquí faltaba del todo:
-- el bloque de novedades del Estudiante (OP11) es **automático** —plazos,
-- notas nuevas, material reciente— y no había ninguna forma de que el
-- docente dijera algo con sus propias palabras: "mañana traigan la
-- protoboard", "la clase del jueves se corre", "revisen la sección 2 antes
-- del taller".
--
-- `cuerpo` va en Markdown, igual que las instrucciones de una actividad
-- (US36) y el contenido de tipo texto (US10), y se renderiza con
-- `MarkdownContent` — nunca como HTML crudo.
--
-- `tutorId` guarda quién lo publicó y no se deduce del curso: un curso
-- adoptado (US47) puede cambiar de manos, y el anuncio sigue siendo de
-- quien lo escribió.
CREATE TABLE "anuncios" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anuncios_pkey" PRIMARY KEY ("id")
);

-- El listado siempre es "los de este curso, lo más nuevo primero".
CREATE INDEX "anuncios_courseId_createdAt_idx" ON "anuncios" ("courseId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "anuncios" ADD CONSTRAINT "anuncios_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "anuncios" ADD CONSTRAINT "anuncios_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, igual que en las migraciones 20261112200000,
-- 20261119040000 y 20261120040000: una tabla de "public" sin RLS se puede
-- leer y modificar desde internet con la clave pública del proyecto a través
-- de la Data API de Supabase. Se activa sin crear políticas — la aplicación
-- entra con Prisma y con service_role, que no pasan por RLS, así que para
-- ella no cambia nada.
ALTER TABLE "public"."anuncios" ENABLE ROW LEVEL SECURITY;
