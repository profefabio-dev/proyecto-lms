// Épica Multi-docente (Backlog.md, US25): crea la primera cuenta Super
// Administrador de la plataforma — el único rol sin espacioId, reservado al
// dueño de la plataforma para dar de alta nuevos espacios de docente.
//
// Se corre UNA sola vez, a mano, desde la máquina del docente (mismo patrón
// que `seed-admin.ts`): `npx tsx scripts/seed-superadmin.ts` (o el runner de
// TypeScript que ya use el proyecto). El correo y la contraseña se pasan por
// las variables de entorno SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD.
import { createSyncedUser } from "../lib/supabase/sync-user";
import { Rol } from "@prisma/client";

async function main() {
  // Revisión de seguridad del 12/11/2026: sin valores por defecto para el
  // correo ni la contraseña — una cuenta con control total de la plataforma
  // no puede crearse con una contraseña publicada en el repositorio.
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Define SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD en el entorno antes de correr este script."
    );
  }

  const superadmin = await createSyncedUser({
    email,
    password,
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
