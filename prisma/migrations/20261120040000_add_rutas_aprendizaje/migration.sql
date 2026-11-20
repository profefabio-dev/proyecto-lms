-- US44 — Rutas de aprendizaje (20/11/2026).
--
-- Cierra una pieza que la descripción del proyecto pedía desde el inicio:
-- "los alumnos podrán asociarse a unas rutas de aprendizaje tipo LMS".
-- Una ruta es una secuencia ordenada de cursos de un mismo Tutor, con un
-- único porcentaje de avance para todo el camino.
--
-- Decisiones de diseño (ver también schema.prisma):
-- - "ruta_cursos" es una tabla intermedia y no un "rutaId" en "courses":
--   un curso puede estar en varias rutas, y el orden pertenece a la
--   relación, no al curso.
-- - Asociarse a una ruta crea las filas de "course_users" de los cursos
--   publicados de esa ruta, en vez de inventar una segunda vía de acceso:
--   así todo el control de acceso ya existente sigue valiendo igual.

-- CreateEnum
CREATE TYPE "EstadoRuta" AS ENUM ('BORRADOR', 'PUBLICADA');

-- CreateTable
CREATE TABLE "rutas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "imagen" TEXT,
    "tutorId" TEXT NOT NULL,
    "estado" "EstadoRuta" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rutas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ruta_cursos" (
    "id" TEXT NOT NULL,
    "rutaId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ruta_cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ruta_usuarios" (
    "id" TEXT NOT NULL,
    "rutaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ruta_usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ruta_cursos_rutaId_courseId_key" ON "ruta_cursos"("rutaId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "ruta_usuarios_rutaId_userId_key" ON "ruta_usuarios"("rutaId", "userId");

-- AddForeignKey
ALTER TABLE "rutas" ADD CONSTRAINT "rutas_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ruta_cursos" ADD CONSTRAINT "ruta_cursos_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "rutas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ruta_cursos" ADD CONSTRAINT "ruta_cursos_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ruta_usuarios" ADD CONSTRAINT "ruta_usuarios_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "rutas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ruta_usuarios" ADD CONSTRAINT "ruta_usuarios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, igual que en las migraciones de secciones,
-- actividades y quizzes: una tabla de "public" sin RLS se puede leer desde
-- internet con la clave pública del proyecto a través de la Data API de
-- Supabase. "ruta_usuarios" relaciona cuentas de menores de edad con lo
-- que están estudiando, así que no puede quedar abierta.
ALTER TABLE "public"."rutas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ruta_cursos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ruta_usuarios" ENABLE ROW LEVEL SECURITY;
