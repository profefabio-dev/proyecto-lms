-- RLS (Row Level Security) por defecto, sin políticas.
--
-- Contexto: Prisma se conecta a Supabase con el rol "postgres", que es DUEÑO de
-- las 6 tablas de esta base de datos (las creó la propia migración inicial de
-- Prisma). Postgres exime del RLS al dueño de la tabla por defecto (a menos que
-- se use FORCE ROW LEVEL SECURITY), así que esta migración NO afecta en absoluto
-- las consultas de la aplicación via Prisma — siguen funcionando exactamente
-- igual que hoy.
--
-- Lo que sí cambia: Supabase expone automáticamente una API REST pública
-- (PostgREST) para cada tabla de este esquema, usando los roles "anon" y
-- "authenticated". Ninguna de las 6 tablas ha tenido nunca RLS activado, así
-- que hoy esa API deja consultar (GET .../rest/v1/<tabla>?select=*) cualquiera
-- de las 6 tablas sin pasar por la autorización de Server Actions/Server
-- Components de esta app. Activar RLS sin políticas hace que esos dos roles
-- reciban "denegado" por defecto en cada tabla, cerrando esa vía — sin escribir
-- políticas por usuario, porque `auth.uid()` (con el que se escriben esas
-- políticas) no tiene forma de poblarse en una conexión de Prisma: no hay
-- propagación del JWT por consulta como sí la hay en el cliente de Supabase.
--
-- Ver Diagrama_de_Arquitectura.md y progress.md para más contexto.

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."course_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."contents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."content_views" ENABLE ROW LEVEL SECURITY;
