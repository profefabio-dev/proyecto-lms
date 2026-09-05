// Script de emergencia (2026-09-02): el docente perdió, en un bloc de
// notas, las contraseñas de los Administradores que había creado.
//
// Importante: no existe ninguna forma de "recuperar" una contraseña
// perdida, ni siquiera si el bloc de notas no se hubiera borrado — Supabase
// Auth nunca guarda la contraseña en texto plano, solo su hash (la misma
// explicación que ya se le dio al docente para OP01, el restablecimiento de
// contraseña desde la interfaz). La única operación posible es
// reemplazarla por una nueva. Los usuarios y todos sus datos (espacios,
// cursos, estudiantes inscritos) siguen intactos: lo único que se perdió
// fue el papel donde estaban anotadas las contraseñas, no las cuentas.
//
// Este script recorre TODOS los usuarios con rol ADMINISTRADOR (en
// cualquier espacio) y les asigna una contraseña temporal nueva, generada
// al azar, reutilizando `resetSyncedUserPassword` (la misma función que ya
// usa la interfaz en OP01). Las muestra una sola vez en la consola.
//
// Uso: npx tsx scripts/reset-admin-passwords.ts
//
// Guarda el resultado en un lugar seguro apenas termine de correr (un
// gestor de contraseñas, idealmente — no un bloc de notas suelto).
import { prisma } from "../lib/prisma";
import { resetSyncedUserPassword } from "../lib/supabase/sync-user";
import { generarPasswordTemporal } from "../lib/auth/generar-password-temporal";

async function main() {
  const administradores = await prisma.users.findMany({
    where: { rol: "ADMINISTRADOR" },
    include: { espacio: true },
    orderBy: { createdAt: "asc" },
  });

  if (administradores.length === 0) {
    console.log("No hay usuarios con rol ADMINISTRADOR en la base de datos.");
    await prisma.$disconnect();
    return;
  }

  console.log(
    `Encontrados ${administradores.length} Administrador(es). Restableciendo contraseñas...\n`
  );

  const resultados: { espacio: string; email: string; passwordNueva: string }[] = [];

  for (const admin of administradores) {
    if (!admin.authId) {
      console.warn(
        `Aviso: ${admin.email} no tiene una cuenta de Supabase Auth vinculada (authId nulo) — se omite.`
      );
      continue;
    }
    const passwordNueva = generarPasswordTemporal();
    await resetSyncedUserPassword({ authId: admin.authId, nuevoPassword: passwordNueva });
    resultados.push({
      espacio: admin.espacio?.nombre ?? "(sin espacio)",
      email: admin.email,
      passwordNueva,
    });
  }

  console.log("\n=== Contraseñas nuevas — guárdalas ahora, no se van a volver a mostrar ===\n");
  for (const r of resultados) {
    console.log(`Espacio: ${r.espacio}\n  Email: ${r.email}\n  Contraseña nueva: ${r.passwordNueva}\n`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
