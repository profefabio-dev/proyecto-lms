import { createSyncedUser } from "../lib/supabase/sync-user";
import { Rol } from "@prisma/client";

async function main() {
  const usuario = await createSyncedUser({
    email: "tutor.prueba@proyecto-lms.test",
    password: "ClaveSegura123!",
    nombre: "Tutor",
    apellido: "De Prueba",
    rol: Rol.TUTOR,
  });

  console.log("Usuario creado y sincronizado:");
  console.log(usuario);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error al crear el usuario sincronizado:", error);
    process.exit(1);
  });