import { createSyncedUser } from "../lib/supabase/sync-user";
import { Rol } from "@prisma/client";

async function main() {
  // Revisión de seguridad del 12/11/2026: el correo y la contraseña ya no se
  // escriben en el código (el repositorio es público); se leen del entorno.
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error("Define TEST_USER_EMAIL y TEST_USER_PASSWORD en el entorno.");
  }

  const usuario = await createSyncedUser({
    email,
    password,
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