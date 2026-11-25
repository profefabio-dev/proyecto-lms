-- US50 (25/11/2026): en qué espacio se creó la cuenta de un estudiante.
--
-- Hasta hoy, "este estudiante pertenece a mi espacio" se deducía de sus
-- inscripciones (`lib/espacio-scope.ts`): visible si tenía al menos una
-- inscripción en un curso de un Tutor del espacio. Eso dejaba dos agujeros
-- que son el mismo visto por los dos lados:
--
--   1. Un estudiante recién creado no tiene ninguna inscripción, así que no
--      aparecía en /tutor/estudiantes. El Tutor lo creaba y lo perdía de
--      vista hasta inscribirlo en algo.
--   2. Por eso mismo, el selector de "Inscribir estudiantes" nunca pudo usar
--      ese filtro —se intentó el 16/09/2026 y hubo que revertirlo el mismo
--      día, porque ningún estudiante nuevo podía asignarse nunca— y quedó
--      listando a TODOS los estudiantes activos de la plataforma, con nombre
--      y correo, incluidos los de otros colegios.
--
-- Este campo da el vínculo que faltaba, sin tocar la decisión del 02/09/2026
-- de que un Estudiante es una cuenta única y compartida entre espacios: no
-- dice "este estudiante es de este colegio y de ningún otro", dice "esta
-- cuenta se creó aquí". Sigue pudiendo inscribirse en cursos de otros
-- espacios; lo que cambia es quién lo ve en un listado sin buscarlo.
--
-- Queda como columna suelta y no como clave foránea, igual que
-- `courses.origenCursoId` (US47): una segunda relación entre `Users` y
-- `Espacios` obligaría a ponerle nombre también a la que ya existe, y nadie
-- consulta esto desde el lado del espacio. Los espacios se desactivan, no se
-- borran (US28), así que no quedan ids colgando.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "espacioOrigenId" TEXT;

-- Relleno 1 — los que ya tienen inscripciones: el espacio del Tutor del
-- primer curso en el que se inscribieron. Es determinista y no inventa nada:
-- si el estudiante ya era visible desde un espacio por inscripción, queda con
-- ese mismo espacio de origen y para él no cambia absolutamente nada.
UPDATE "users" AS u
SET "espacioOrigenId" = origen."espacioId"
FROM (
  SELECT DISTINCT ON (cu."userId")
    cu."userId" AS "userId",
    tutor."espacioId" AS "espacioId"
  FROM "course_users" cu
  JOIN "courses" c ON c."id" = cu."courseId"
  JOIN "users" tutor ON tutor."id" = c."tutorId"
  WHERE tutor."espacioId" IS NOT NULL
  ORDER BY cu."userId", cu."fecha" ASC
) AS origen
WHERE u."id" = origen."userId"
  AND u."rol" = 'ESTUDIANTE'
  AND u."espacioOrigenId" IS NULL;

-- Relleno 2 — los que no tienen ninguna inscripción (creados y nunca
-- inscritos). Solo se rellenan **si en toda la plataforma hay un único
-- espacio con tutores**: en ese caso no hay ninguna ambigüedad posible sobre
-- dónde se creó la cuenta. Si hubiera dos o más, esta sentencia no hace nada
-- a propósito — adivinar de qué colegio es un estudiante es exactamente el
-- error que esta migración viene a corregir, y esos casos los tiene que
-- resolver una persona.
UPDATE "users"
SET "espacioOrigenId" = (
  SELECT DISTINCT "espacioId" FROM "users"
  WHERE "rol" = 'TUTOR' AND "espacioId" IS NOT NULL
)
WHERE "rol" = 'ESTUDIANTE'
  AND "espacioOrigenId" IS NULL
  AND (
    SELECT COUNT(DISTINCT "espacioId") FROM "users"
    WHERE "rol" = 'TUTOR' AND "espacioId" IS NOT NULL
  ) = 1;

CREATE INDEX IF NOT EXISTS "users_espacioOrigenId_idx" ON "users" ("espacioOrigenId");

-- `users` ya tiene RLS activado desde la migración 20260831181412, así que no
-- hace falta repetirlo: esta migración agrega una columna, no una tabla.
