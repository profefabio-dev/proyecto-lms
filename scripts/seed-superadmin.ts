// Épica Multi-docente (Backlog.md, US25): crea la primera cuenta Super
// Administrador de la plataforma — el único rol sin espacioId, reservado al
// dueño de la plataforma para dar de alta nuevos espacios de docente.
//
// Se corre UNA sola vez, a mano, desde la máquina del docente (mismo patrón
// que `seed-admin.ts`): `npx tsx scripts/seed-superadmin.ts` (o el runner de
// TypeScript que ya use el proyecto). Cambiar el email/password de abajo
// antes de correrlo, o pasarlos por variables de entorno si se prefiere no
// dejarlos en texto plano en este archivo.
import { createSyncedUser } from "../lib/supabase/sync-user";
import { Rol } from "@prisma/client";

async function main() {
  const superadmin = await createSyncedUser({
    email: process.env.SUPERADMIN_EMAIL ?? "superadmin@proyecto-lms.test",
    password: process.env.SUPERADMIN_PASSWORD ?? "CambiarClaveSuperAdmin123!",
    nombre: process.env.SUPERADMIN_NOMBRE ?? "Super",
    apellido: process.env.SUPERADMIN_APELLIDO ?? "Administrador",
    rol: Rol.SUPERADMIN,
    // Sin espacioId a propósito: SUPERADMIN opera sobre todos los espacios,
    // no pertenece a ninguno.
  });
  console.log("Super Administrador creado:", superadmin);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
