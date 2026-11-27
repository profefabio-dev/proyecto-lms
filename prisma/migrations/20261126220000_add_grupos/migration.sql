-- US32 (26/11/2026): Gestión de Grupos / Salones de clase (ej. "6A", "7B").
-- Promueve `grado` de texto suelto a una entidad `Grupos` propia por espacio.
CREATE TABLE "grupos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "espacioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupos_pkey" PRIMARY KEY ("id")
);

-- Un nombre de grupo no puede repetirse dentro del mismo espacio (no hay dos "6A" en el mismo colegio).
CREATE UNIQUE INDEX "grupos_nombre_espacioId_key" ON "grupos"("nombre", "espacioId");
CREATE INDEX "grupos_espacioId_idx" ON "grupos"("espacioId");

-- Clave foránea al espacio: si se elimina un espacio, se eliminan sus grupos en cascada.
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vincular `grupoId` opcional en la tabla `users`
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "grupoId" TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Poblar automáticamente los grupos a partir de los `grado` ya existentes en `users`
-- para los estudiantes que tienen espacioOrigenId o espacioId asignado
INSERT INTO "grupos" ("id", "nombre", "espacioId", "createdAt")
SELECT gen_random_uuid()::text, TRIM(u."grado"), COALESCE(u."espacioId", u."espacioOrigenId"), CURRENT_TIMESTAMP
FROM "users" u
WHERE u."grado" IS NOT NULL AND TRIM(u."grado") <> '' AND COALESCE(u."espacioId", u."espacioOrigenId") IS NOT NULL
GROUP BY TRIM(u."grado"), COALESCE(u."espacioId", u."espacioOrigenId")
ON CONFLICT ("nombre", "espacioId") DO NOTHING;

-- Enlazar los estudiantes a sus grupos creados
UPDATE "users" u
SET "grupoId" = g."id"
FROM "grupos" g
WHERE TRIM(u."grado") = g."nombre"
  AND COALESCE(u."espacioId", u."espacioOrigenId") = g."espacioId"
  AND u."grupoId" IS NULL;

-- Row Level Security (regla 4 del proyecto): se activa en la misma migración que crea la tabla.
ALTER TABLE "public"."grupos" ENABLE ROW LEVEL SECURITY;
