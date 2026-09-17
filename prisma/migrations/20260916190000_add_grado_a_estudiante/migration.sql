-- AlterTable
-- US29 (carga masiva), 16/09/2026: se agrega el grado/grupo detectado en
-- la hoja de origen del Excel al crear un estudiante, para poder
-- distinguirlos visualmente por grupo en "Asignar estudiantes". Columna
-- opcional (NULL para estudiantes ya existentes y para los creados a
-- mano sin ese dato).
ALTER TABLE "users" ADD COLUMN "grado" TEXT;
