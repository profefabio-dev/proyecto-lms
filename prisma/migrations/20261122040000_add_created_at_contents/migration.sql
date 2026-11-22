-- 22/11/2026: `contents` era la única tabla de contenido del curso sin fecha
-- de creación (`actividades`, `quizzes`, `secciones` y `courses` ya la
-- tienen). Sin ella no hay forma de saber qué lección es nueva, que es lo
-- que necesita el bloque de novedades del panel del Estudiante.
--
-- Las filas que ya existen toman la fecha en que se aplique esta migración,
-- así que durante los primeros días todo el material anterior va a contar
-- como nuevo. Es el precio de no haberla guardado desde el principio y se
-- pasa solo.
ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
