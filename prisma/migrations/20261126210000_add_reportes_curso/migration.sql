-- US49 (26/11/2026): reportes de moderación sobre cursos compartidos en el catálogo.
--
-- Permite que cualquier docente (Tutor) reporte un curso ajeno que contenga material
-- inapropiado para menores, derechos infringidos, spam o lenguaje ofensivo.
-- Esto protege la seguridad de la comunidad educativa y de los menores de edad.
CREATE TABLE "reportes_curso" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "detalles" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reportes_curso_pkey" PRIMARY KEY ("id")
);

-- Búsquedas frecuentes: los reportes de un curso concreto ordenados por fecha.
CREATE INDEX "reportes_curso_courseId_createdAt_idx" ON "reportes_curso" ("courseId", "createdAt" DESC);

-- Claves foráneas: si el curso o el usuario se eliminan, se limpian sus reportes en cascada.
ALTER TABLE "reportes_curso" ADD CONSTRAINT "reportes_curso_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reportes_curso" ADD CONSTRAINT "reportes_curso_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security (regla 4 del proyecto): se activa en la misma migración que crea la tabla.
ALTER TABLE "public"."reportes_curso" ENABLE ROW LEVEL SECURITY;
