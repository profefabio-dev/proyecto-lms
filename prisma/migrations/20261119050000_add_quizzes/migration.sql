-- Evaluaciones de opción múltiple con calificación automática
-- (19/11/2026). Complementan a "actividades": ahí el estudiante entrega
-- algo que el docente lee y califica; aquí el sistema corrige solo y
-- devuelve el resultado al instante.
--
-- Decisiones de diseño (ver también schema.prisma):
-- - "opciones_quiz"."esCorrecta" vive en la base, no en el navegador: las
--   consultas de las páginas del estudiante seleccionan solo id y texto,
--   porque enviarlo al HTML sería publicar la hoja de respuestas.
-- - "intentos_quiz" conserva todos los intentos en vez de sobrescribir el
--   anterior (a diferencia de "entregas"): en un quiz repetir es parte del
--   aprendizaje y el docente quiere ver la evolución.
-- - Las respuestas del intento se guardan como JSON { preguntaId: opcionId }
--   para poder mostrar en qué se equivocó sin una quinta tabla.

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "seccionId" TEXT,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preguntas_quiz" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "preguntas_quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opciones_quiz" (
    "id" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "esCorrecta" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "opciones_quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intentos_quiz" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "respuestas" JSONB NOT NULL,
    "correctas" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "puntaje" DOUBLE PRECISION NOT NULL,
    "realizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intentos_quiz_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "secciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preguntas_quiz" ADD CONSTRAINT "preguntas_quiz_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones_quiz" ADD CONSTRAINT "opciones_quiz_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "preguntas_quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intentos_quiz" ADD CONSTRAINT "intentos_quiz_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intentos_quiz" ADD CONSTRAINT "intentos_quiz_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, igual que en 20261112200000 y en la migración de
-- actividades: una tabla de "public" sin RLS se puede leer desde internet
-- con la clave pública del proyecto a través de la Data API de Supabase.
-- Aquí importa el doble: "opciones_quiz" contiene cuál es la respuesta
-- correcta, e "intentos_quiz" los resultados de menores de edad.
ALTER TABLE "public"."quizzes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."preguntas_quiz" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."opciones_quiz" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."intentos_quiz" ENABLE ROW LEVEL SECURITY;
