import { createSyncedUser } from "../lib/supabase/sync-user";
import { Rol } from "@prisma/client";

async function main() {
  const admin = await createSyncedUser({
    email: "admin.prueba@proyecto-lms.test",
    password: "ClaveAdmin123!",
    nombre: "Admin",
    apellido: "De Prueba",
    rol: Rol.ADMINISTRADOR,
  });
  console.log("Administrador creado:", admin);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });