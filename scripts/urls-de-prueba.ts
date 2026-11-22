// Imprime las URLs exactas que hacen falta para las pruebas de seguridad del
// bloque D de `Checklist_Validacion_Manual.md` (21/11/2026).
//
// Esas tres pruebas consisten en pedir a mano una URL que la plataforma debe
// negar. El problema práctico es que para armarlas hay que conocer el id de un
// contenido, de una evaluación o de una ruta, y esos ids no se ven en ninguna
// pantalla. Este script los busca y arma las direcciones, para que la prueba
// sea copiar, pegar y mirar qué responde.
//
//   npx tsx scripts/urls-de-prueba.ts
//
// No escribe nada: solo lee.

import { prisma } from "../lib/prisma";

const BASE = process.env.URL_BASE ?? "http://localhost:3000";

async function main() {
  console.log(`\nURLs de prueba (base: ${BASE})\n${"=".repeat(60)}`);

  // ---------------------------------------------------------------- D.1
  // Una lección que el estudiante NO debe poder abrir: o está oculta, o
  // vive en una sección que el tutor dejó en NO_DISPONIBLE. El control de
  // acceso no mira `visible` a mano, exige que la lección esté en la
  // secuencia accesible del curso — así que las dos deben dar 404.
  const inaccesibles = await prisma.contents.findMany({
    where: {
      OR: [{ visible: false }, { seccion: { estado: "NO_DISPONIBLE" } }],
    },
    select: {
      id: true,
      titulo: true,
      visible: true,
      courseId: true,
      course: { select: { titulo: true } },
      seccion: { select: { titulo: true, estado: true } },
    },
    take: 5,
  });

  console.log("\nD.1 — Lecciones que deben dar 404 al estudiante\n");
  if (inaccesibles.length === 0) {
    console.log("   No hay ninguna. Oculta un contenido o deja una sección en");
    console.log("   NO_DISPONIBLE desde la pantalla del curso, y vuelve a correr esto.");
  } else {
    for (const c of inaccesibles) {
      const motivo = !c.visible
        ? "contenido oculto"
        : `sección "${c.seccion?.titulo}" en ${c.seccion?.estado}`;
      console.log(`   ${c.course.titulo} → ${c.titulo}`);
      console.log(`   motivo: ${motivo}`);
      console.log(`   ${BASE}/estudiante/cursos/${c.courseId}/lecciones/${c.id}\n`);
    }
  }

  // ---------------------------------------------------------------- D.2
  // La página de una evaluación publicada. Lo que se comprueba aquí no es
  // que cargue, sino que en su código fuente (Ctrl+U) NO aparezca la
  // palabra `esCorrecta`: si apareciera, la hoja de respuestas estaría
  // publicada en el HTML y bastaría con mirarla.
  const quizzes = await prisma.quizzes.findMany({
    where: { visible: true },
    select: {
      id: true,
      titulo: true,
      courseId: true,
      course: { select: { titulo: true } },
      _count: { select: { preguntas: true } },
    },
    take: 3,
  });

  console.log("D.2 — Evaluaciones: busca `esCorrecta` en el código fuente (no debe estar)\n");
  if (quizzes.length === 0) {
    console.log("   No hay ninguna evaluación publicada.\n");
  } else {
    for (const q of quizzes) {
      console.log(`   ${q.course.titulo} → ${q.titulo} (${q._count.preguntas} preguntas)`);
      console.log(`   ${BASE}/estudiante/cursos/${q.courseId}/quizzes/${q.id}\n`);
    }
  }

  // ---------------------------------------------------------------- D.3
  // Una ruta en borrador no existe para el estudiante: el catálogo solo
  // muestra las publicadas, y entrar por URL debe dar 404.
  const borradores = await prisma.rutas.findMany({
    where: { estado: "BORRADOR" },
    select: { id: true, titulo: true, _count: { select: { cursos: true } } },
    take: 3,
  });

  console.log("D.3 — Rutas en borrador que deben dar 404 al estudiante\n");
  if (borradores.length === 0) {
    console.log("   No hay ninguna ruta en borrador. Crea una desde /tutor/rutas");
    console.log("   (una ruta nace en borrador) y vuelve a correr esto.\n");
  } else {
    for (const r of borradores) {
      console.log(`   ${r.titulo} (${r._count.cursos} cursos)`);
      console.log(`   ${BASE}/estudiante/rutas/${r.id}\n`);
    }
  }

  // ------------------------------------------------- contexto para B.5/B.7
  const actividades = await prisma.actividades.findMany({
    where: { visible: true },
    select: { titulo: true, course: { select: { titulo: true } } },
    take: 5,
  });

  const rutaPublicada = await prisma.rutas.findFirst({
    where: { estado: "PUBLICADA" },
    select: { id: true, titulo: true, _count: { select: { cursos: true, inscritos: true } } },
  });

  console.log(`${"=".repeat(60)}\nPara el resto del recorrido\n`);
  console.log(`   Actividades que puedes entregar (B.5):`);
  for (const a of actividades) {
    console.log(`     · ${a.titulo}  (${a.course.titulo})`);
  }
  if (rutaPublicada) {
    console.log(
      `\n   Ruta publicada (B.7): "${rutaPublicada.titulo}" — ` +
        `${rutaPublicada._count.cursos} cursos, ${rutaPublicada._count.inscritos} asociados`
    );
    console.log(`     ${BASE}/estudiante/rutas/${rutaPublicada.id}`);
  }
  console.log();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
