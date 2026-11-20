// Siembra un curso de demostración con TODOS los recursos que la plataforma
// sabe manejar hasta hoy (20/11/2026), para poder recorrerla completa sin
// tener que crear cada cosa a mano:
//
//   - 2 secciones: una "Disponible" y marcada como semana actual, y otra
//     "No disponible", para ver de un lado y del otro qué se oculta (US30).
//   - Contenido de los tres tipos: video de YouTube (US08), texto en
//     Markdown (US10) y un documento PDF real subido a Storage (US09).
//     Además, un contenido oculto, para comprobar que el Estudiante no lo ve.
//   - Una actividad evaluable con fecha límite (US36).
//   - Una evaluación de opción múltiple publicada, con 3 preguntas (US40).
//   - Estudiantes inscritos (los que ya existan; si no hay ninguno, crea uno).
//   - Con `--con-datos`: simula también la actividad del estudiante —
//     contenidos vistos, una entrega ya calificada y un intento del quiz —
//     para que el panel de seguimiento (US39) se vea con números reales en
//     vez de vacío.
//
// Uso, desde la máquina del docente (aquí sí están los motores de Prisma):
//
//   npx tsx scripts/seed-curso-demo.ts
//   npx tsx scripts/seed-curso-demo.ts --con-datos
//   npx tsx scripts/seed-curso-demo.ts --tutor=correo@del.tutor
//   npx tsx scripts/seed-curso-demo.ts --borrar
//
// Si no se indica `--tutor`, usa el primer Tutor que encuentre y lo dice.
// Todo lo que crea cuelga de un único curso, con un título fijo, así que
// `--borrar` lo deja todo como estaba — no toca ningún dato real.

import { randomUUID } from "node:crypto";
import { Rol, TipoContenido, EstadoSeccion, EstadoCurso } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { supabaseAdmin } from "../lib/supabase/admin";
import { createSyncedUser } from "../lib/supabase/sync-user";
import { generarPasswordTemporal } from "../lib/auth/generar-password-temporal";

const TITULO_CURSO = "Curso de demostración (datos de prueba)";
const BUCKET_DOCUMENTOS = "documentos";

const args = process.argv.slice(2);
const conDatos = args.includes("--con-datos");
const borrar = args.includes("--borrar");
const tutorPedido = args.find((a) => a.startsWith("--tutor="))?.split("=")[1];

// Un PDF mínimo y válido, escrito a mano: evita depender de una librería
// solo para tener un archivo de verdad que descargar desde la plataforma.
function construirPdfDemo(): Buffer {
  const texto = "Documento de demostracion del LMS";
  const objetos = [
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj",
    "4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
    `5 0 obj<</Length ${texto.length + 44}>>stream\nBT /F1 18 Tf 72 760 Td (${texto}) Tj ET\nendstream endobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const posiciones: number[] = [];

  for (const objeto of objetos) {
    posiciones.push(pdf.length);
    pdf += objeto + "\n";
  }

  const inicioTabla = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const posicion of posiciones) {
    pdf += String(posicion).padStart(10, "0") + " 00000 n \n";
  }
  pdf += `trailer<</Size ${objetos.length + 1}/Root 1 0 R>>\nstartxref\n${inicioTabla}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

async function borrarCursoDemo() {
  const curso = await prisma.courses.findFirst({
    where: { titulo: TITULO_CURSO },
    include: { contenidos: { include: { documentos: true } }, actividades: true, quizzes: true },
  });

  if (!curso) {
    console.log("No hay ningún curso de demostración que borrar.");
    return;
  }

  // Los archivos de Storage se borran antes que las filas, para no perder
  // la referencia y dejarlos huérfanos en el bucket.
  const archivos = curso.contenidos.flatMap((contenido) =>
    contenido.documentos.map((documento) => documento.archivo)
  );
  const entregas = await prisma.entregas.findMany({
    where: { actividadId: { in: curso.actividades.map((a) => a.id) } },
  });
  for (const entrega of entregas) {
    if (entrega.archivo) archivos.push(entrega.archivo);
  }
  if (archivos.length > 0) {
    await supabaseAdmin.storage.from(BUCKET_DOCUMENTOS).remove(archivos);
  }

  const idsContenidos = curso.contenidos.map((c) => c.id);
  const idsActividades = curso.actividades.map((a) => a.id);
  const idsQuizzes = curso.quizzes.map((q) => q.id);
  const preguntas = await prisma.preguntasQuiz.findMany({
    where: { quizId: { in: idsQuizzes } },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.contentViews.deleteMany({ where: { contentId: { in: idsContenidos } } }),
    prisma.documents.deleteMany({ where: { contentId: { in: idsContenidos } } }),
    prisma.entregas.deleteMany({ where: { actividadId: { in: idsActividades } } }),
    prisma.intentosQuiz.deleteMany({ where: { quizId: { in: idsQuizzes } } }),
    prisma.opcionesQuiz.deleteMany({
      where: { preguntaId: { in: preguntas.map((p) => p.id) } },
    }),
    prisma.preguntasQuiz.deleteMany({ where: { quizId: { in: idsQuizzes } } }),
    prisma.quizzes.deleteMany({ where: { courseId: curso.id } }),
    prisma.actividades.deleteMany({ where: { courseId: curso.id } }),
    prisma.contents.deleteMany({ where: { courseId: curso.id } }),
    prisma.secciones.deleteMany({ where: { courseId: curso.id } }),
    prisma.courseUsers.deleteMany({ where: { courseId: curso.id } }),
    prisma.courses.delete({ where: { id: curso.id } }),
  ]);

  console.log(`Borrado el curso de demostración y todo lo que colgaba de él.`);
  console.log(`(Las cuentas de estudiante NO se borran: pueden tener otros cursos.)`);
}

async function main() {
  if (borrar) {
    await borrarCursoDemo();
    return;
  }

  const yaExiste = await prisma.courses.findFirst({ where: { titulo: TITULO_CURSO } });
  if (yaExiste) {
    throw new Error(
      `Ya existe un curso llamado "${TITULO_CURSO}". Córrelo con --borrar primero si quieres rehacerlo.`
    );
  }

  // 1. Tutor dueño del curso.
  const tutor = tutorPedido
    ? await prisma.users.findFirst({ where: { email: tutorPedido, rol: Rol.TUTOR } })
    : await prisma.users.findFirst({ where: { rol: Rol.TUTOR }, orderBy: { createdAt: "asc" } });

  if (!tutor) {
    throw new Error(
      tutorPedido
        ? `No encontré ningún Tutor con el correo ${tutorPedido}.`
        : "No hay ningún Tutor en la plataforma. Crea uno desde /admin/tutores y vuelve a correr esto."
    );
  }
  console.log(`Tutor: ${tutor.nombre} ${tutor.apellido} <${tutor.email}>`);

  // 2. Estudiantes a inscribir: los que ya existan, hasta 3. Si no hay
  //    ninguno, se crea uno para que el curso no quede vacío.
  let estudiantes = await prisma.users.findMany({
    where: { rol: Rol.ESTUDIANTE, estado: "ACTIVO" },
    orderBy: { createdAt: "asc" },
    take: 3,
  });

  if (estudiantes.length === 0) {
    const password = generarPasswordTemporal();
    const email = `estudiante.demo.${Date.now()}@estudiantes-lms.local`;
    const nuevo = await createSyncedUser({
      email,
      password,
      nombre: "Estudiante",
      apellido: "De Demostración",
      rol: Rol.ESTUDIANTE,
    });
    estudiantes = [nuevo];
    console.log(`\nNo había estudiantes. Creé uno:`);
    console.log(`   correo:     ${email}`);
    console.log(`   contraseña: ${password}   <-- anótala, solo se muestra ahora\n`);
  }

  // 3. El curso.
  const curso = await prisma.courses.create({
    data: {
      titulo: TITULO_CURSO,
      descripcion:
        "Curso sembrado automáticamente para recorrer la plataforma completa: contenido de los tres tipos, secciones, una actividad evaluable y una evaluación automática.",
      imagen: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
      tutorId: tutor.id,
      estado: EstadoCurso.PUBLICADO,
    },
  });

  await prisma.courseUsers.createMany({
    data: estudiantes.map((estudiante) => ({ courseId: curso.id, userId: estudiante.id })),
    skipDuplicates: true,
  });

  // 4. Secciones: una disponible y marcada como semana actual, otra no
  //    disponible — así se ve de inmediato qué oculta cada estado.
  const semana1 = await prisma.secciones.create({
    data: {
      courseId: curso.id,
      titulo: "Semana 1 — Introducción",
      orden: 0,
      estado: EstadoSeccion.DISPONIBLE,
      esActual: true,
    },
  });

  const semana2 = await prisma.secciones.create({
    data: {
      courseId: curso.id,
      titulo: "Semana 2 — Todavía no disponible",
      orden: 1,
      estado: EstadoSeccion.NO_DISPONIBLE,
      esActual: false,
    },
  });

  // 5. Contenido de los tres tipos, más uno oculto.
  const video = await prisma.contents.create({
    data: {
      courseId: curso.id,
      seccionId: semana1.id,
      titulo: "Video: qué es el pensamiento computacional",
      descripcion: "Una introducción corta en video.",
      tipo: TipoContenido.VIDEO,
      contenido: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      orden: 0,
      visible: true,
    },
  });

  const texto = await prisma.contents.create({
    data: {
      courseId: curso.id,
      seccionId: semana1.id,
      titulo: "Lectura: conceptos básicos",
      descripcion: "Texto con formato, para comprobar el Markdown.",
      tipo: TipoContenido.TEXTO,
      contenido: [
        "## De qué se trata",
        "",
        "Este texto existe para comprobar que el **formato enriquecido** funciona:",
        "",
        "- Los títulos se ven como títulos",
        "- Las listas se ven como listas",
        "- La **negrita** se ve en negrita",
        "",
        "Si en vez de eso ves los símbolos `##` y `**` tal cual, algo está mal.",
      ].join("\n"),
      orden: 1,
      visible: true,
    },
  });

  await prisma.contents.create({
    data: {
      courseId: curso.id,
      seccionId: semana2.id,
      titulo: "Contenido oculto (no debería verlo el estudiante)",
      descripcion: "Sirve para comprobar el filtro de visibilidad.",
      tipo: TipoContenido.TEXTO,
      contenido: "Si un estudiante ve esto, el filtro de `visible` está fallando.",
      orden: 2,
      visible: false,
    },
  });

  // 6. Documento real en Storage. Si el bucket no existe o la subida falla,
  //    se avisa y se sigue: el resto del curso no depende de esto.
  let documentoCreado = false;
  try {
    const path = `${curso.id}/${randomUUID()}-guia-demo.pdf`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_DOCUMENTOS)
      .upload(path, construirPdfDemo(), { contentType: "application/pdf", upsert: false });

    if (error) throw new Error(error.message);

    await prisma.contents.create({
      data: {
        courseId: curso.id,
        seccionId: semana1.id,
        titulo: "Guía de trabajo (PDF)",
        descripcion: "Documento descargable, para probar la previsualización.",
        tipo: TipoContenido.DOCUMENTO,
        contenido: path,
        orden: 3,
        visible: true,
        documentos: { create: { archivo: path, nombre: "guia-demo.pdf", tipo: "application/pdf" } },
      },
    });
    documentoCreado = true;
  } catch (error) {
    console.warn(
      `\nAviso: no se pudo subir el PDF de demostración (${
        error instanceof Error ? error.message : error
      }).`
    );
    console.warn(`El resto del curso sí quedó creado. Revisa que exista el bucket "documentos".\n`);
  }

  // 7. Actividad evaluable, con plazo dentro de una semana.
  const enUnaSemana = new Date();
  enUnaSemana.setDate(enUnaSemana.getDate() + 7);

  const actividad = await prisma.actividades.create({
    data: {
      courseId: curso.id,
      seccionId: semana1.id,
      titulo: "Actividad 1: tu primer algoritmo",
      descripcion: "Entrega escrita o en archivo.",
      instrucciones: [
        "## Qué tienes que hacer",
        "",
        "Escribe en tus palabras los pasos de un algoritmo sencillo que uses a diario.",
        "",
        "- Mínimo cinco pasos",
        "- En orden",
        "",
        "**Puedes entregar** escribiendo aquí mismo, adjuntando un archivo, o las dos cosas.",
      ].join("\n"),
      puntajeMaximo: 100,
      fechaLimite: enUnaSemana,
      orden: 0,
      visible: true,
    },
  });

  // 8. Evaluación automática, ya publicada, con tres preguntas.
  const quiz = await prisma.quizzes.create({
    data: {
      courseId: curso.id,
      seccionId: semana1.id,
      titulo: "Evaluación 1: repaso de la semana",
      descripcion: "Tres preguntas, se califica sola.",
      orden: 0,
      visible: true,
    },
  });

  const preguntas = [
    {
      enunciado: "¿Qué es un algoritmo?",
      opciones: [
        { texto: "Una secuencia ordenada de pasos para resolver un problema", correcta: true },
        { texto: "Un tipo de computador", correcta: false },
        { texto: "Un lenguaje de programación", correcta: false },
      ],
    },
    {
      enunciado: "Un diagrama de flujo sirve para representar un algoritmo.",
      opciones: [
        { texto: "Verdadero", correcta: true },
        { texto: "Falso", correcta: false },
      ],
    },
    {
      enunciado: "¿Cuál de estos NO es un paso válido en un algoritmo?",
      opciones: [
        { texto: "Repetir una acción mientras se cumpla una condición", correcta: false },
        { texto: "Tomar una decisión según un dato", correcta: false },
        { texto: "Adivinar el resultado sin calcularlo", correcta: true },
        { texto: "Guardar un valor para usarlo después", correcta: false },
      ],
    },
  ];

  for (const [indice, pregunta] of preguntas.entries()) {
    await prisma.preguntasQuiz.create({
      data: {
        quizId: quiz.id,
        enunciado: pregunta.enunciado,
        orden: indice,
        opciones: {
          create: pregunta.opciones.map((opcion, posicion) => ({
            texto: opcion.texto,
            esCorrecta: opcion.correcta,
            orden: posicion,
          })),
        },
      },
    });
  }

  // 9. Opcional: actividad simulada del estudiante, para que el panel de
  //    seguimiento no se vea vacío.
  if (conDatos) {
    const primero = estudiantes[0];

    await prisma.contentViews.createMany({
      data: [
        { contentId: video.id, userId: primero.id },
        { contentId: texto.id, userId: primero.id },
      ],
      skipDuplicates: true,
    });

    await prisma.entregas.create({
      data: {
        actividadId: actividad.id,
        userId: primero.id,
        texto:
          "Mi algoritmo para preparar café: 1) hervir agua, 2) poner el filtro, 3) agregar el café molido, 4) verter el agua, 5) servir.",
        nota: 85,
        retroalimentacion: "Buen trabajo. Te faltó indicar cuánta agua y cuánto café.",
        calificadaEn: new Date(),
      },
    });

    const preguntasDelQuiz = await prisma.preguntasQuiz.findMany({
      where: { quizId: quiz.id },
      include: { opciones: true },
      orderBy: { orden: "asc" },
    });

    // Responde bien las dos primeras y mal la tercera: 2 de 3.
    const respuestas: Record<string, string> = {};
    preguntasDelQuiz.forEach((pregunta, indice) => {
      const correcta = pregunta.opciones.find((o) => o.esCorrecta)!;
      const incorrecta = pregunta.opciones.find((o) => !o.esCorrecta)!;
      respuestas[pregunta.id] = indice < 2 ? correcta.id : incorrecta.id;
    });

    await prisma.intentosQuiz.create({
      data: {
        quizId: quiz.id,
        userId: primero.id,
        respuestas,
        correctas: 2,
        total: preguntasDelQuiz.length,
        puntaje: Math.round((2 / preguntasDelQuiz.length) * 100),
      },
    });

    console.log(`\nSe simuló la actividad de ${primero.nombre} ${primero.apellido}:`);
    console.log(`   2 contenidos vistos, 1 entrega calificada (85/100), 1 intento del quiz (2/3).`);
  }

  console.log(`\nListo. Curso "${TITULO_CURSO}" creado:`);
  console.log(`   2 secciones (una no disponible)`);
  console.log(`   ${documentoCreado ? 4 : 3} contenidos (uno oculto${documentoCreado ? ", uno PDF" : ""})`);
  console.log(`   1 actividad evaluable, con plazo en una semana`);
  console.log(`   1 evaluación publicada, con 3 preguntas`);
  console.log(`   ${estudiantes.length} estudiante(s) inscrito(s)`);
  console.log(`\nEntra como tutor a /tutor/cursos y ábrelo.`);
  console.log(`Para deshacerlo: npx tsx scripts/seed-curso-demo.ts --borrar`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
