import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

// Dentro de la app Next.js (dev/build/servidor), `next` ya carga `.env` por su
// cuenta antes de que corra este archivo. Pero un script suelto ejecutado
// fuera de Next (`npx tsx scripts/seed-superadmin.ts`, por ejemplo) NO pasa
// por ese arranque, así que `process.env.NEXT_PUBLIC_SUPABASE_URL` llega
// vacío y `createClient` falla con "supabaseUrl is required." — el error
// visto al intentar correr `scripts/seed-superadmin.ts` directamente.
// `loadEnvConfig` (el mismo cargador que usa Next internamente) no
// sobrescribe variables que ya existan en `process.env`, así que llamarlo
// aquí es seguro también dentro de la app real: cuando Next ya cargó todo,
// esto no hace nada.
loadEnvConfig(process.cwd());

// ADVERTENCIA: este cliente usa la service_role key, que tiene permisos totales.
// Solo se debe importar en código que corre en el servidor (Server Actions,
// Route Handlers). Nunca en un componente marcado "use client".
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
