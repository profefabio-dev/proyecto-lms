-- US52 (25/11/2026): la ventana de entrega y el tipo exigido.
--
-- Las dos ideas salen de revisar la plataforma del colegio (Chamilo), cuyo
-- formulario de tarea ofrece dos fechas distintas —vencimiento y
-- finalización— y el tipo de documento aceptado. Eran las dos decisiones que
-- aquí estaban tomadas por el código y no por el docente.
--
-- `fechaCierre` NO reemplaza a `fechaLimite`, la complementa: pasada la
-- fecha límite la entrega se sigue aceptando y se marca fuera de plazo
-- (decisión del 19/11/2026, que sigue en pie), y solo la fecha de cierre
-- bloquea. Es opcional, así que una actividad sin cierre se comporta
-- exactamente como hasta hoy — las que ya existen no cambian de reglas a
-- mitad de curso, igual que con `intentosMaximos` en OP08.
ALTER TABLE "actividades" ADD COLUMN IF NOT EXISTS "fechaCierre" TIMESTAMP(3);

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoEntrega') THEN
    CREATE TYPE "TipoEntrega" AS ENUM ('AMBOS', 'SOLO_TEXTO', 'SOLO_ARCHIVO');
  END IF;
END $$;

-- `AMBOS` por defecto: es lo que la plataforma ha permitido siempre, así que
-- ninguna actividad existente cambia de comportamiento.
ALTER TABLE "actividades"
  ADD COLUMN IF NOT EXISTS "tipoEntrega" "TipoEntrega" NOT NULL DEFAULT 'AMBOS';

-- `actividades` ya tiene RLS activado desde la migración 20261119040000 que
-- la creó; esta solo agrega columnas.
