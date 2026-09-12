-- US30: organiza el contenido de un curso en secciones plegables con
-- estado (Disponible/No disponible) y una marca opcional de "semana
-- actual". Diseño acordado con el docente (08/09/2026): entidad nueva
-- "Secciones" en vez de reutilizar campos existentes, estado fijado a
-- mano por el Tutor (no calculado por fecha, mismo patrón que
-- Contents.visible en US12), y "seccionId" opcional en "contents" para
-- que el contenido de los cursos ya existentes quede sin sección, sin
-- forzar nada — sigue viéndose exactamente igual que hoy hasta que un
-- Tutor decida agrupar contenido en secciones.

-- CreateEnum
CREATE TYPE "EstadoSeccion" AS ENUM ('DISPONIBLE', 'NO_DISPONIBLE');

-- CreateTable
CREATE TABLE "secciones" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoSeccion" NOT NULL DEFAULT 'DISPONIBLE',
    "esActual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secciones_pkey" PRIMARY KEY ("id")
);

-- AlterTable: "seccionId" queda NULL en todo el contenido existente (y en
-- cualquier contenido nuevo que no se asigne a una sección) — a propósito,
-- sin backfill ni migración de datos.
ALTER TABLE "contents" ADD COLUMN "seccionId" TEXT;

-- AddForeignKey
ALTER TABLE "secciones" ADD CONSTRAINT "secciones_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "secciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
