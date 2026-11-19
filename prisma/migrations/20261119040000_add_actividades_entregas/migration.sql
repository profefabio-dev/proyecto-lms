-- Actividades evaluables y sus entregas (19/11/2026). Cierra la mitad del
-- ciclo que faltaba: hasta ahora la plataforma entregaba contenido y
-- registraba vistas ("content_views"), pero el estudiante no tenía nada que
-- presentar ni el docente nada que calificar.
--
-- Decisiones de diseño (ver también los comentarios en schema.prisma):
-- - Entidad propia en vez de un valor más en "TipoContenido": una actividad
--   tiene puntaje, fecha límite y entregas, que un contenido no tiene.
-- - "seccionId" opcional, igual que en "contents" (US30): una actividad
--   puede colgar de una sección o quedar suelta en el curso.
-- - Una sola entrega por estudiante y actividad (índice único): si el
--   estudiante vuelve a entregar, reemplaza la anterior en vez de acumular
--   intentos.

-- CreateTable
CREATE TABLE "actividades" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "seccionId" TEXT,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "instrucciones" TEXT NOT NULL,
    "puntajeMaximo" INTEGER NOT NULL DEFAULT 100,
    "fechaLimite" TIMESTAMP(3),
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" TEXT NOT NULL,
    "actividadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "texto" TEXT,
    "archivo" TEXT,
    "nombreArchivo" TEXT,
    "entregadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota" DOUBLE PRECISION,
    "retroalimentacion" TEXT,
    "calificadaEn" TIMESTAMP(3),

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entregas_actividadId_userId_key" ON "entregas"("actividadId", "userId");

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "secciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "actividades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row Level Security, igual que en la migración 20261112200000: una tabla
-- de "public" sin RLS se puede leer y modificar desde internet con la clave
-- pública del proyecto a través de la Data API de Supabase. Se activa sin
-- crear políticas: la aplicación entra con Prisma (rol dueño, que no pasa
-- por RLS) y con service_role, así que nada cambia para ella. Esto importa
-- especialmente aquí, porque "entregas" guarda trabajos y notas de menores
-- de edad.
ALTER TABLE "public"."actividades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."entregas" ENABLE ROW LEVEL SECURITY;
