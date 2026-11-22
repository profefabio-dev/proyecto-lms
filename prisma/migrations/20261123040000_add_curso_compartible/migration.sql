-- US47 (23/11/2026): un Tutor puede tomar el curso de otro y quedarse con
-- su propia copia.
--
-- `compartible` nace en false: nada circula sin que su autor lo diga.
--
-- `origenCursoId` y `origenAutor` guardan de dónde salió una copia. El
-- autor se guarda como texto y no como clave foránea a propósito: así el
-- crédito sobrevive aunque el curso original se borre o su autor deje la
-- plataforma. Con una FK habría que elegir entre perder el crédito o
-- impedir el borrado, y ninguna de las dos es aceptable.
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "compartible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "origenCursoId" TEXT;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "origenAutor" TEXT;

-- El catálogo (US48) filtra por esta columna en todos los espacios, así que
-- conviene el índice desde ya.
CREATE INDEX IF NOT EXISTS "courses_compartible_idx" ON "courses" ("compartible");
