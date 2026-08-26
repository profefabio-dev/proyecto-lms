import { createClient } from "@supabase/supabase-js";

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