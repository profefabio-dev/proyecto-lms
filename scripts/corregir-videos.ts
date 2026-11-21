// Cambia los enlaces de video rotos por los buenos, sin tocar nada más
// (21/11/2026).
//
// La primera versión de `cursos-de-tecnologia.ts` quedó con cinco enlaces de
// YouTube equivocados: dos apuntaban a videos que no existen y tres a videos
// en inglés de otro tema. Los cursos creados con ella tienen esos enlaces
// guardados en la base de datos, y cambiar el script de siembra no los
// arregla — solo afecta a los cursos que se creen de ahí en adelante.
//
// Esto es el arreglo directo: busca los contenidos de tipo VIDEO que tengan
// uno de los enlaces malos y le pone el bueno. No borra cursos, no borra
// progreso, no borra entregas ni notas. Si el curso ya lo recorrieron
// estudiantes, se queda todo como está y solo cambia el video.
//
//   npx tsx scripts/corregir-videos.ts              (muestra qué cambiaría)
//   npx tsx scripts/corregir-videos.ts --aplicar    (lo cambia)

import { prisma } from "../lib/prisma";
import { extraerYoutubeId } from "../lib/youtube";

const aplicar = process.argv.includes("--aplicar");

// id que quedó guardado  ->  id correcto, con por qué estaba mal
const REEMPLAZOS: Record<string, { nuevo: string; motivo: string }> = {
  "0ofN2x0C2vk": {
    nuevo: "gVaE2F0jOJs",
    motivo: "no existe → El Salón de Informática, hardware y software (3:14)",
  },
  "_C5AHaS1mOA": {
    nuevo: "KmId8zVw0DQ",
    motivo: "era un documental de 1983 en inglés → Profe Emir, sistemas operativos (1:52)",
  },
  "4P_gj3oRn8s": {
    nuevo: "rHDTJQKW2y8",
    motivo: "estaba en inglés → Smile and Learn, privacidad online para niños (3:21)",
  },
  "3NjQ9b3pgIg": {
    nuevo: "sVKaQUCG73g",
    motivo: "estaba en inglés y duraba 11 min → Yoigo, phishing y estafas (2:28)",
  },
  sxUJKn6TJOI: {
    nuevo: "vDrfsiy21To",
    motivo: "no existe → Code and Play, pensamiento computacional para niños (3:04)",
  },
};

type VideoGuardado = {
  id: string;
  titulo: string;
  contenido: string;
  course: { titulo: string };
};

type Correccion = { video: VideoGuardado; reemplazo: { nuevo: string; motivo: string } };

async function main() {
  const videos: VideoGuardado[] = await prisma.contents.findMany({
    where: { tipo: "VIDEO" },
    select: { id: true, titulo: true, contenido: true, course: { select: { titulo: true } } },
  });

  // Se compara por id de YouTube, no por la cadena completa, para que no
  // importe si el enlace quedó guardado como watch?v=, youtu.be o /embed/.
  const porCorregir: Correccion[] = videos
    .map((video): Correccion | null => {
      const id = extraerYoutubeId(video.contenido);
      const reemplazo = id ? REEMPLAZOS[id] : undefined;
      return reemplazo ? { video, reemplazo } : null;
    })
    .filter((fila): fila is Correccion => fila !== null);

  if (porCorregir.length === 0) {
    console.log(
      `\nRevisé ${videos.length} video(s) y ninguno tiene un enlace de los malos.` +
        "\nSi aun así ves 'Este video es privado', el contenido que estás viendo no salió" +
        "\nde este script: dime el título de la lección y lo miramos.\n"
    );
    return;
  }

  console.log(`\n${porCorregir.length} video(s) por corregir:\n`);
  for (const { video, reemplazo } of porCorregir) {
    console.log(`  ${video.course.titulo}`);
    console.log(`    ${video.titulo}`);
    console.log(`    ${reemplazo.motivo}\n`);
  }

  if (!aplicar) {
    console.log("Esto fue solo una simulación. Para aplicarlo:");
    console.log("   npx tsx scripts/corregir-videos.ts --aplicar\n");
    return;
  }

  await prisma.$transaction(
    porCorregir.map(({ video, reemplazo }) =>
      prisma.contents.update({
        where: { id: video.id },
        data: { contenido: `https://www.youtube.com/watch?v=${reemplazo.nuevo}` },
      })
    )
  );

  console.log(`Listo: ${porCorregir.length} enlace(s) corregido(s). Recarga la lección.\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
