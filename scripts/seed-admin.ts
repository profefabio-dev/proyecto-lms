// Crea una cuenta de Administrador a mano, desde la máquina del docente:
//
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... npx tsx scripts/seed-admin.ts
//
// Revisión de seguridad del 12/11/2026: antes este archivo traía el correo y
// la contraseña escritos en el código, y el repositorio es público — la
// contraseña de una cuenta con permisos de administrador no puede vivir en
// el código. Ahora ambos datos son obligatorios y se leen del entorno; el
// script se niega a correr si faltan, en vez de usar un valor por defecto.
import { createSyncedUser } from "../lib/supabase/sync-user";
import { Rol } from "@prisma/client";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD en el entorno antes de correr este script.");
  }

  const admin = await createSyncedUser({
    email,
    password,
    nombre: process.env.ADMIN_NOMBRE ?? "Admin",
    apellido: process.env.ADMIN_APELLIDO ?? "De Prueba",
    rol: Rol.ADMINISTRADOR,
  });
  console.log("Administrador creado:", admin.id);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
