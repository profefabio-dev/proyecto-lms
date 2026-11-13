-- Revisión de seguridad del 12/11/2026: `espacios` (US24) y `secciones`
-- (US30) se crearon después de la migración que activó Row Level Security
-- (20260831181412) y quedaron sin ella. En Supabase, una tabla de `public`
-- sin RLS se puede leer y modificar desde internet con la clave pública del
-- proyecto (la que viaja al navegador) a través de la Data API — se
-- comprobó leyendo filas de ambas tablas desde fuera.
--
-- Igual que en las otras tablas, se activa RLS sin crear ninguna política:
-- la aplicación accede solo con Prisma (rol dueño de las tablas, que no
-- pasa por RLS) y con la clave service_role, así que nada cambia para ella;
-- lo único que se cierra es el acceso directo con la clave pública.
ALTER TABLE "public"."espacios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."secciones" ENABLE ROW LEVEL SECURITY;

-- La tabla interna de Prisma tampoco debe ser visible desde la Data API.
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
