import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  // A diferencia de `next dev`/`next build`, Vitest no carga automáticamente
  // los archivos .env del proyecto. La mayoría de las pruebas mockean
  // Prisma/Supabase y no lo necesitan, pero las que sí usan un cliente real
  // (por ejemplo las que dependen del enum `Rol` generado por Prisma)
  // fallan en la máquina del docente por variables como DATABASE_URL o
  // NEXT_PUBLIC_SUPABASE_URL sin definir, aunque en GitHub Actions sí
  // pasen porque CI las inyecta como secrets. `loadEnv` replica el mismo
  // orden de archivos que usa Next.js (.env, .env.local, .env.[mode],
  // .env.[mode].local); el tercer argumento "" hace que cargue todas las
  // variables, no solo las que empiezan con VITE_.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    test: {
      environment: "node",
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname),
      },
    },
  };
});
