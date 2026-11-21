-- OP08 — límite de intentos por evaluación (21/11/2026).
--
-- El docente probó una evaluación de punta a punta y pidió que "al
-- configurarlo debería establecerse un límite de intentos": hoy un
-- estudiante puede repetir indefinidamente hasta acertar por eliminación,
-- lo que vacía de sentido el resultado.
--
-- La columna es opcional a propósito. NULL significa "sin límite", que es
-- exactamente como se han comportado todas las evaluaciones existentes, así
-- que las que ya están publicadas no cambian de reglas a mitad de curso: el
-- límite solo aplica donde el Tutor decide ponerlo.
--
-- El tope se verifica del lado del servidor en `responderQuiz`, no solo
-- ocultando el formulario: si se validara únicamente en la pantalla,
-- bastaría con reenviar la petición para seguir intentando.

ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "intentosMaximos" INTEGER;
