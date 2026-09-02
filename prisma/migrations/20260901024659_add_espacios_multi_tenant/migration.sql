-- Épica Multi-docente (Backlog.md, Sprint 7, US24) — base de aislamiento entre
-- Administradores/Tutores, sin afectar a los Estudiantes (cuenta única y
-- compartida entre espacios, decisión del 02/09/2026 — ver
-- Descripcion_del_Proyecto.md y Diagrama_de_Arquitectura.md).

-- AlterEnum: agrega el rol Super Administrador. No se usa en ninguna fila
-- dentro de esta misma migración (el alta de la primera cuenta SUPERADMIN
-- se hace aparte, con `scripts/seed-superadmin.ts`, después de aplicar esto),
-- así que es seguro agregarlo aquí sin chocar con la restricción de Postgres
-- de no poder usar un valor de enum recién agregado en la misma transacción
-- que lo agrega.
ALTER TYPE "Rol" ADD VALUE 'SUPERADMIN';

-- CreateTable
CREATE TABLE "espacios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "espacios_pkey" PRIMARY KEY ("id")
);

-- AlterTable: "espacioId" queda NULL para SUPERADMIN y ESTUDIANTE — solo es
-- obligatorio a nivel de aplicación para ADMINISTRADOR/TUTOR (no se agrega
-- una restricción NOT NULL a nivel de base de datos porque un mismo campo no
-- puede ser obligatorio para unos roles y no para otros con una sola columna).
ALTER TABLE "users" ADD COLUMN "espacioId" TEXT;

-- Espacio por defecto para todo lo construido en el MVP (docente Fabio Andrés
-- Aguirre). El id es fijo y legible a propósito, para poder referenciarlo con
-- claridad en scripts o consultas futuras si hiciera falta.
INSERT INTO "espacios" ("id", "nombre", "estado", "createdAt")
VALUES ('00000000-0000-4000-8000-000000000001', 'Fabio Andrés Aguirre', 'ACTIVO', CURRENT_TIMESTAMP);

-- Backfill: todo Administrador/Tutor existente pasa a pertenecer al espacio
-- por defecto de arriba. Los Estudiantes no se tocan — nunca tuvieron ni
-- necesitan un espacio propio.
UPDATE "users"
SET "espacioId" = '00000000-0000-4000-8000-000000000001'
WHERE "rol" IN ('ADMINISTRADOR', 'TUTOR');

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
