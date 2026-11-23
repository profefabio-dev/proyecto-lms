-- US49 (24/11/2026): el sello de la plataforma sobre un curso compartido.
--
-- Dos niveles en el catálogo: "de la comunidad" (cumple los requisitos
-- mínimos y se publica sin pedir permiso a nadie) y "verificado" (el Super
-- Administrador lo revisó y lleva el respaldo de la plataforma).
--
-- El filtro no decide qué se publica, decide qué lleva el nombre de la
-- plataforma: nadie queda bloqueado esperando una aprobación, y nada sin
-- revisar lleva el sello.
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "verificado" BOOLEAN NOT NULL DEFAULT false;
