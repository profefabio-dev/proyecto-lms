// Deja montado el ensayo de la épica de compartir material (25/11/2026).
//
// US47, US48 y US49 están construidas y **ninguna se ha visto en un
// navegador**, porque probarlas de punta a punta necesita algo que no existe
// en la plataforma del docente: **un segundo Tutor con un curso compartido**.
// Armarlo a mano es crear la cuenta, inventarle un curso, cargarle tres
// lecciones, una actividad y una evaluación, ponerle portada y descripción
// —porque sin eso US49 no deja compartirlo— y recién entonces empezar a
// probar. Eso es lo que hace este script, para que el recorrido del bloque
// F/G de `Checklist_Validacion_Manual.md` sea entrar y mirar.
//
//   npx tsx scripts/tutor-de-prueba.ts                   (solo informa, no toca nada)
//   npx tsx scripts/tutor-de-prueba.ts --crear
//   npx tsx scripts/tutor-de-prueba.ts --crear --clave-nueva
//   npx tsx scripts/tutor-de-prueba.ts --borrar          (lista qué borraría)
//   npx tsx scripts/tutor-de-prueba.ts --borrar --confirmar
//
// Qué deja montado:
//
//   · Un **espacio aparte** ("Espacio de prueba — compartir"). A propósito no
//     es el espacio del docente: el catálogo de US48 es la única pantalla del
//     proyecto que cruza espacios, y si el segundo Tutor viviera en el mismo
//     espacio la prueba no demostraría eso.
//   · Un **Tutor de prueba** con su contraseña temporal, que se muestra una
//     sola vez en consola (igual que al crear cualquier cuenta: Supabase Auth
//     solo guarda el hash).
//   · Un **curso completo y ya compartido**, que cumple los cuatro requisitos
//     de US49 — cinco lecciones visibles, una actividad, una evaluación,
//     portada y descripción larga— pero **sin el sello de verificado**, para
//     que ponerlo sea el paso G.2 del recorrido y no algo ya hecho.
//   · Un **segundo curso publicado y NO compartido**, que es lo que hace
//     posible el paso **F.10**: entrar a su ficha del catálogo tiene que dar
//     404. Es la prueba que más importa de la épica — sin esa guarda, conocer
//     un id bastaría para leer el curso de otro docente.
//   · Un **estudiante de prueba** inscrito en el curso compartido, con una
//     lección vista, una entrega calificada y un intento de evaluación. Sin
//     esto el paso F.7 ("la copia no debe traer ni un estudiante, ni una
//     entrega, ni una nota") no probaría nada, porque no habría nada que
//     dejar atrás. Es una cuenta nueva, no uno de los estudiantes reales: el
//     curso de prueba no debe aparecerle a nadie del colegio.
//
// Nada de esto toca los cursos, los estudiantes ni las notas que ya existen.
// `--borrar` deshace solo lo que creó este script, y **las copias que se
// hayan adoptado se conservan**: `origenCursoId` guarda el id como texto y no
// como clave foránea justamente para que borrar el original no se lleve la
// copia por delante (US47).

import { randomUUID } from "node:crypto";
import { Rol, TipoContenido, EstadoSeccion, EstadoCurso } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { supabaseAdmin } from "../lib/supabase/admin";
import { BUCKET_DOCUMENTOS } from "../lib/supabase/storage";
import { createSyncedUser, resetSyncedUserPassword } from "../lib/supabase/sync-user";
import { generarPasswordTemporal } from "../lib/auth/generar-password-temporal";
import { componerCodigo } from "../lib/code-content";
import { faltaParaCompartir, mensajeDeRequisitos } from "../lib/course-shareable";

const args = process.argv.slice(2);
const crear = args.includes("--crear");
const borrar = args.includes("--borrar");
const confirmar = args.includes("--confirmar");
const claveNueva = args.includes("--clave-nueva");

const ESPACIO = "Espacio de prueba — compartir";
const TUTOR = {
  email: "tutor.prueba@proyecto-lms.local",
  nombre: "Marcela",
  apellido: "Osorio",
};
const ESTUDIANTE = {
  email: "estudiante.prueba@proyecto-lms.local",
  nombre: "Samuel",
  apellido: "Rivas",
};

const CURSO_COMPARTIDO = "Robótica educativa con Tinkercad (curso de prueba)";
const CURSO_PRIVADO = "Taller interno sin compartir (curso de prueba)";

// Los dos videos y el enlace salen de `scripts/cursos-de-tecnologia.ts`, donde
// quedaron comprobados uno por uno contra YouTube el 21-22/11/2026. Se
// reutilizan a propósito en vez de buscar otros: la regla que quedó de OP10 es
// que un enlace externo no se escribe de memoria, y aquí no hace falta
// arriesgar enlaces nuevos solo para un curso de prueba. Lo mismo con la
// portada, que viene de las que se verificaron en la revisión del 23/11.
const VIDEO_CIRCUITOS = "https://www.youtube.com/watch?v=GUESpG6inds";
const VIDEO_PROTOBOARD = "https://www.youtube.com/watch?v=AaXXu292iNg";
const ENLACE_TINKERCAD = "https://www.tinkercad.com/circuits";
const PORTADA = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200";

type Leccion = {
  titulo: string;
  descripcion: string;
  tipo: "VIDEO" | "TEXTO" | "ENLACE" | "CODIGO" | "DOCUMENTO";
  cuerpo?: string;
  lenguaje?: string;
  pdf?: string;
  seccion: number;
  visible?: boolean;
};

// Cinco lecciones visibles: una más que el mínimo de US49, para que el curso
// siga cumpliendo los requisitos aunque al probar se oculte alguna (es
// justamente lo que pide el paso F.3). La sexta nace oculta a propósito: así
// se ve, al adoptar, que la copia también se la trae.
const LECCIONES: Leccion[] = [
  {
    titulo: "Circuitos en serie y en paralelo",
    descripcion: "La diferencia que hay que entender antes de armar cualquier cosa.",
    tipo: "VIDEO",
    cuerpo: VIDEO_CIRCUITOS,
    seccion: 0,
  },
  {
    titulo: "Cómo se usa una protoboard",
    descripcion: "Dónde va cada cable y por qué las filas están conectadas así.",
    tipo: "VIDEO",
    cuerpo: VIDEO_PROTOBOARD,
    seccion: 0,
  },
  {
    titulo: "Los componentes que vamos a usar",
    descripcion: "Resistencias, LED, pulsadores y la placa.",
    tipo: "TEXTO",
    cuerpo: [
      "## Lo que vas a tener en la mesa",
      "",
      "- **LED**: tiene una pata más larga que la otra. La larga es el positivo.",
      "- **Resistencia**: protege el LED. Sin ella se quema, y no avisa antes.",
      "- **Pulsador**: cierra el circuito mientras lo tienes apretado.",
      "- **Protoboard**: no suelda nada, así que puedes equivocarte y volver atrás.",
      "",
      "Si algo no prende, revisa en este orden: que el LED no esté al revés, que la",
      "resistencia esté en el camino, y que los cables estén en la fila correcta.",
    ].join("\n"),
    seccion: 0,
  },
  {
    titulo: "Simulador de circuitos de Tinkercad",
    descripcion: "Para armar y probar sin tener los componentes delante.",
    tipo: "ENLACE",
    cuerpo: ENLACE_TINKERCAD,
    seccion: 1,
  },
  {
    titulo: "Guía de la práctica",
    descripcion: "El paso a paso que vamos a seguir en el taller.",
    tipo: "DOCUMENTO",
    pdf: "Guia de la practica: LED, resistencia y pulsador en protoboard.",
    seccion: 1,
  },
  {
    titulo: "Hacer titilar el LED (lo veremos la próxima clase)",
    descripcion: "Queda publicado pero oculto hasta que lleguemos a este punto.",
    tipo: "CODIGO",
    lenguaje: "cpp",
    cuerpo: [
      "void setup() {",
      "  pinMode(13, OUTPUT);",
      "}",
      "",
      "void loop() {",
      "  digitalWrite(13, HIGH);",
      "  delay(500);",
      "  digitalWrite(13, LOW);",
      "  delay(500);",
      "}",
    ].join("\n"),
    seccion: 1,
    visible: false,
  },
];

const DESCRIPCION_COMPARTIDO =
  "Curso corto de robótica y electrónica básica para bachillerato: circuitos en serie y " +
  "en paralelo, uso de la protoboard, los componentes mínimos y una práctica guiada que se " +
  "puede hacer con el simulador de Tinkercad cuando no hay material físico en el colegio.";

/** Un PDF mínimo pero válido, igual que en `scripts/cursos-de-tecnologia.ts`. */
function construirPdf(texto: string): Buffer {
  const limpio = texto.replace(/[()\\]/g, "");
  const objetos = [
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj",
    "4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
    `5 0 obj<</Length ${limpio.length + 44}>>stream\nBT /F1 14 Tf 60 760 Td (${limpio}) Tj ET\nendstream endobj`,
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

async function informar() {
  const tutor = await prisma.users.findUnique({ where: { email: TUTOR.email } });

  if (!tutor) {
    console.log("Todavía no hay nada montado.\n");
    console.log("Corre `npx tsx scripts/tutor-de-prueba.ts --crear` y en un minuto tendrás:");
    console.log("  · un segundo Tutor con su contraseña");
    console.log("  · un curso completo y ya compartido, sin el sello de verificado");
    console.log("  · un curso publicado y sin compartir, para la prueba de 404");
    console.log("  · un estudiante con una entrega calificada en el curso compartido\n");
    return;
  }

  const cursos = await prisma.courses.findMany({
    where: { tutorId: tutor.id },
    select: {
      id: true,
      titulo: true,
      compartible: true,
      verificado: true,
      estado: true,
      _count: { select: { inscritos: true, contenidos: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Tutor de prueba: ${tutor.nombre} ${tutor.apellido} <${tutor.email}>`);
  console.log(`Sus cursos (${cursos.length}):\n`);

  for (const curso of cursos) {
    const marcas = [
      curso.estado,
      curso.compartible ? "COMPARTIDO" : "sin compartir",
      curso.verificado ? "VERIFICADO" : "sin sello",
    ].join(" · ");
    console.log(`  ${curso.titulo}`);
    console.log(`    ${marcas} — ${curso._count.contenidos} lecciones, ${curso._count.inscritos} inscritos`);
    console.log(`    /tutor/catalogo/${curso.id}\n`);
  }

  const adopciones = await prisma.courses.findMany({
    where: { origenCursoId: { in: cursos.map((c: { id: string }) => c.id) } },
    select: { titulo: true, tutor: { select: { nombre: true, apellido: true } } },
  });

  if (adopciones.length > 0) {
    console.log("Ya se adoptó:");
    for (const copia of adopciones) {
      console.log(`  "${copia.titulo}" — copia de ${copia.tutor.nombre} ${copia.tutor.apellido}`);
    }
    console.log();
  }

  console.log("Para rehacerlo desde cero: --borrar --confirmar y después --crear.");
  console.log("Para una contraseña nueva sin borrar nada: --crear --clave-nueva.\n");
}

async function crearTodo() {
  // ---- El espacio ----
  let espacio = await prisma.espacios.findFirst({ where: { nombre: ESPACIO } });
  if (!espacio) {
    espacio = await prisma.espacios.create({ data: { nombre: ESPACIO } });
    console.log(`Espacio creado: ${ESPACIO}`);
  } else {
    console.log(`El espacio "${ESPACIO}" ya existía.`);
  }

  // ---- El Tutor ----
  let tutor = await prisma.users.findUnique({ where: { email: TUTOR.email } });
  let clave: string | null = null;

  if (!tutor) {
    clave = generarPasswordTemporal();
    tutor = await createSyncedUser({
      ...TUTOR,
      password: clave,
      rol: Rol.TUTOR,
      espacioId: espacio.id,
    });
    console.log(`Tutor creado: ${TUTOR.nombre} ${TUTOR.apellido}`);
  } else {
    console.log(`El tutor ${TUTOR.email} ya existía.`);
    if (claveNueva && tutor.authId) {
      clave = generarPasswordTemporal();
      await resetSyncedUserPassword({ authId: tutor.authId, nuevoPassword: clave });
      console.log("  Contraseña restablecida.");
    }
  }

  // ---- El estudiante de prueba ----
  let estudiante = await prisma.users.findUnique({ where: { email: ESTUDIANTE.email } });
  let claveEstudiante: string | null = null;

  if (!estudiante) {
    claveEstudiante = generarPasswordTemporal();
    estudiante = await createSyncedUser({
      ...ESTUDIANTE,
      password: claveEstudiante,
      rol: Rol.ESTUDIANTE,
    });
    console.log(`Estudiante creado: ${ESTUDIANTE.nombre} ${ESTUDIANTE.apellido}`);
  } else {
    console.log(`El estudiante ${ESTUDIANTE.email} ya existía.`);
    if (claveNueva && estudiante.authId) {
      claveEstudiante = generarPasswordTemporal();
      await resetSyncedUserPassword({
        authId: estudiante.authId,
        nuevoPassword: claveEstudiante,
      });
      console.log("  Contraseña restablecida.");
    }
  }

  // ---- El curso compartido ----
  let compartido = await prisma.courses.findFirst({
    where: { titulo: CURSO_COMPARTIDO, tutorId: tutor.id },
  });

  if (compartido) {
    console.log(`El curso "${CURSO_COMPARTIDO}" ya existía, lo dejo como está.`);
  } else {
    compartido = await prisma.courses.create({
      data: {
        titulo: CURSO_COMPARTIDO,
        descripcion: DESCRIPCION_COMPARTIDO,
        imagen: PORTADA,
        tutorId: tutor.id,
        estado: EstadoCurso.PUBLICADO,
        // Se comparte desde el principio, pero **sin verificar**: poner el
        // sello es el paso G.2 del recorrido.
        compartible: true,
        verificado: false,
      },
    });

    const secciones = [];
    for (const [indice, titulo] of ["Antes de armar nada", "Manos a la obra"].entries()) {
      secciones.push(
        await prisma.secciones.create({
          data: {
            courseId: compartido.id,
            titulo,
            orden: indice,
            estado: EstadoSeccion.DISPONIBLE,
            esActual: indice === 0,
          },
        })
      );
    }

    let orden = 0;
    const idsVisibles: string[] = [];

    for (const leccion of LECCIONES) {
      const base = {
        courseId: compartido.id,
        seccionId: secciones[leccion.seccion].id,
        titulo: leccion.titulo,
        descripcion: leccion.descripcion,
        orden: orden++,
        visible: leccion.visible !== false,
      };

      if (leccion.tipo === "DOCUMENTO") {
        // Si el bucket no existe o la subida falla, se avisa y se sigue: el
        // resto del curso no depende de este archivo. Vale la pena que esta
        // lección exista, porque adoptar el curso **duplica** el archivo en
        // Storage (US47) y es la parte de la copia más fácil de romper.
        try {
          const path = `${compartido.id}/${randomUUID()}-guia.pdf`;
          const { error } = await supabaseAdmin.storage
            .from(BUCKET_DOCUMENTOS)
            .upload(path, construirPdf(leccion.pdf ?? leccion.titulo), {
              contentType: "application/pdf",
              upsert: false,
            });
          if (error) throw new Error(error.message);

          const contenido = await prisma.contents.create({
            data: {
              ...base,
              tipo: TipoContenido.DOCUMENTO,
              contenido: path,
              documentos: {
                create: { archivo: path, nombre: "guia.pdf", tipo: "application/pdf" },
              },
            },
          });
          idsVisibles.push(contenido.id);
        } catch (error) {
          console.warn(
            `  Aviso: no se pudo subir el PDF (${
              error instanceof Error ? error.message : error
            }). El curso sí quedó creado, pero sin esa lección.`
          );
          orden--;
        }
        continue;
      }

      const tipo =
        leccion.tipo === "VIDEO"
          ? TipoContenido.VIDEO
          : leccion.tipo === "TEXTO"
            ? TipoContenido.TEXTO
            : leccion.tipo === "ENLACE"
              ? TipoContenido.ENLACE
              : TipoContenido.CODIGO;

      const contenido = await prisma.contents.create({
        data: {
          ...base,
          tipo,
          contenido:
            leccion.tipo === "CODIGO"
              ? componerCodigo(leccion.lenguaje ?? "", leccion.cuerpo ?? "")
              : (leccion.cuerpo ?? ""),
        },
      });

      if (base.visible) idsVisibles.push(contenido.id);
    }

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 10);

    const actividad = await prisma.actividades.create({
      data: {
        courseId: compartido.id,
        seccionId: secciones[1].id,
        titulo: "Arma el circuito y envía la foto",
        descripcion: "Un LED que prenda al apretar el pulsador.",
        instrucciones: [
          "Arma en la protoboard —o en el simulador de Tinkercad— un circuito con:",
          "",
          "1. Un LED",
          "2. Una resistencia que lo proteja",
          "3. Un pulsador que lo prenda solo mientras está apretado",
          "",
          "Envía **una foto** del circuito armado y **dos o tres líneas** contando qué",
          "te costó más. Si algo no funcionó, cuéntalo igual: eso también se califica.",
        ].join("\n"),
        puntajeMaximo: 100,
        fechaLimite,
        visible: true,
        orden: 0,
      },
    });

    const quiz = await prisma.quizzes.create({
      data: {
        courseId: compartido.id,
        seccionId: secciones[0].id,
        titulo: "Circuitos: lo básico",
        descripcion: "Tres preguntas para ver si quedó claro antes del taller.",
        intentosMaximos: 2,
        visible: true,
        orden: 0,
      },
    });

    const preguntas = [
      {
        enunciado: "En un circuito en serie, si se quema un bombillo, ¿qué pasa con los demás?",
        opciones: ["Se apagan todos", "Siguen prendidos", "Prenden más fuerte"],
        correcta: 0,
      },
      {
        enunciado: "¿Para qué sirve la resistencia junto a un LED?",
        opciones: [
          "Para que el LED brille más",
          "Para que no le llegue más corriente de la que aguanta",
          "Para cambiarle el color",
        ],
        correcta: 1,
      },
      {
        enunciado: "¿Cuál pata del LED es el positivo?",
        opciones: ["La más corta", "La más larga", "Da igual, no tiene polaridad"],
        correcta: 1,
      },
    ];

    for (const [posicion, pregunta] of preguntas.entries()) {
      await prisma.preguntasQuiz.create({
        data: {
          quizId: quiz.id,
          enunciado: pregunta.enunciado,
          orden: posicion,
          opciones: {
            create: pregunta.opciones.map((texto, i) => ({
              texto,
              esCorrecta: i === pregunta.correcta,
              orden: i,
            })),
          },
        },
      });
    }

    // ---- El rastro del estudiante ----
    //
    // Inscripción, una lección vista, una entrega YA CALIFICADA y un intento
    // de la evaluación. Esto es lo que hace que el paso F.7 signifique algo:
    // al adoptar el curso, nada de esto puede aparecer en la copia.
    await prisma.courseUsers.create({
      data: { courseId: compartido.id, userId: estudiante.id },
    });

    if (idsVisibles.length > 0) {
      await prisma.contentViews.create({
        data: { contentId: idsVisibles[0], userId: estudiante.id },
      });
    }

    await prisma.entregas.create({
      data: {
        actividadId: actividad.id,
        userId: estudiante.id,
        texto:
          "Lo armé en Tinkercad porque no tenía protoboard en casa. Me costó entender " +
          "que el pulsador tenía que ir antes del LED y no después.",
        nota: 85,
        retroalimentacion:
          "Muy bien el circuito. Para la próxima, cuéntame también qué resistencia usaste.",
        calificadaEn: new Date(),
      },
    });

    await prisma.intentosQuiz.create({
      data: {
        quizId: quiz.id,
        userId: estudiante.id,
        respuestas: {},
        correctas: 2,
        total: 3,
        puntaje: 66.67,
      },
    });

    console.log(`Curso compartido creado: "${CURSO_COMPARTIDO}"`);
    console.log(
      `  ${idsVisibles.length} lecciones visibles, 1 actividad, 1 evaluación, 1 estudiante con nota`
    );
  }

  // ---- El curso que NO se comparte (para la prueba de 404) ----
  let privado = await prisma.courses.findFirst({
    where: { titulo: CURSO_PRIVADO, tutorId: tutor.id },
  });

  if (privado) {
    console.log(`El curso "${CURSO_PRIVADO}" ya existía.`);
  } else {
    privado = await prisma.courses.create({
      data: {
        titulo: CURSO_PRIVADO,
        descripcion:
          "Curso publicado para los estudiantes de este tutor, pero que su autor nunca " +
          "marcó como compartible. Existe solo para comprobar que conocer su id no " +
          "alcanza para verlo desde el catálogo.",
        imagen: PORTADA,
        tutorId: tutor.id,
        estado: EstadoCurso.PUBLICADO,
        compartible: false,
      },
    });
    console.log(`Curso sin compartir creado: "${CURSO_PRIVADO}"`);
  }

  // ---- Comprobación de que el curso de verdad cumple US49 ----
  //
  // Se marcó `compartible: true` escribiendo directo en la base de datos, sin
  // pasar por `alternarCursoCompartible`, así que conviene confirmar con la
  // misma función que usa la pantalla que el curso habría pasado el filtro.
  // Si no cumpliera, el ensayo arrancaría con datos que la interfaz nunca
  // habría permitido crear.
  const paraRevisar = await prisma.courses.findUnique({
    where: { id: compartido.id },
    select: {
      descripcion: true,
      imagen: true,
      contenidos: { where: { visible: true }, select: { id: true } },
      actividades: { where: { visible: true }, select: { id: true } },
      quizzes: { where: { visible: true }, select: { id: true } },
    },
  });

  if (paraRevisar) {
    const falta = faltaParaCompartir({
      descripcion: paraRevisar.descripcion,
      imagen: paraRevisar.imagen,
      leccionesVisibles: paraRevisar.contenidos.length,
      actividadesVisibles: paraRevisar.actividades.length,
      evaluacionesVisibles: paraRevisar.quizzes.length,
    });

    console.log(`\nRequisitos de US49: ${mensajeDeRequisitos(falta)}`);
    if (falta.length > 0) {
      console.log(
        "  Ojo: el curso quedó compartido pero NO cumpliría el filtro de la pantalla.\n" +
          "  Lo más probable es que falle la subida del PDF y falte una lección."
      );
    }
  }

  // ---- Lo que hay que saber para probar ----
  console.log("\n" + "─".repeat(70));
  console.log("PARA PROBAR\n");

  if (clave) {
    console.log(`Tutor de prueba    ${TUTOR.email}`);
    console.log(`Contraseña         ${clave}      ← anótala, no se vuelve a mostrar`);
  } else {
    console.log(`Tutor de prueba    ${TUTOR.email}`);
    console.log("Contraseña         la de siempre (usa --clave-nueva si la perdiste)");
  }

  if (claveEstudiante) {
    console.log(`\nEstudiante         ${ESTUDIANTE.email}`);
    console.log(`Contraseña         ${claveEstudiante}      ← anótala también`);
  }

  console.log(`\nCon TU cuenta de Tutor:`);
  console.log(`  Catálogo         /tutor/catalogo`);
  console.log(`  Ficha del curso  /tutor/catalogo/${compartido.id}`);
  console.log(`  Paso F.10 (404)  /tutor/catalogo/${privado.id}   ← debe dar 404`);
  console.log(`\nCon tu cuenta de Super Administrador, para el bloque G:`);
  console.log(`  Misma ficha      /tutor/catalogo/${compartido.id}`);
  console.log("\nEl recorrido completo está en Checklist_Validacion_Manual.md, bloques F y G.");
  console.log("─".repeat(70) + "\n");
}

async function borrarTodo() {
  const tutor = await prisma.users.findUnique({ where: { email: TUTOR.email } });
  const estudiante = await prisma.users.findUnique({ where: { email: ESTUDIANTE.email } });
  const espacio = await prisma.espacios.findFirst({ where: { nombre: ESPACIO } });

  if (!tutor && !estudiante && !espacio) {
    console.log("No hay nada de este script que borrar.");
    return;
  }

  const cursos = tutor
    ? await prisma.courses.findMany({
        where: { tutorId: tutor.id },
        select: { id: true, titulo: true },
      })
    : [];

  const copias = cursos.length
    ? await prisma.courses.findMany({
        where: { origenCursoId: { in: cursos.map((c: { id: string }) => c.id) } },
        select: { titulo: true, tutor: { select: { nombre: true, apellido: true } } },
      })
    : [];

  console.log("Se borraría:\n");
  if (tutor) console.log(`  Tutor      ${tutor.email} (cuenta + Supabase Auth)`);
  if (estudiante) console.log(`  Estudiante ${estudiante.email} (cuenta + Supabase Auth)`);
  for (const curso of cursos) console.log(`  Curso      ${curso.titulo}`);
  if (espacio) console.log(`  Espacio    ${espacio.nombre}`);

  if (copias.length > 0) {
    console.log(`\nSe CONSERVAN las ${copias.length} copias ya adoptadas:`);
    for (const copia of copias) {
      console.log(`  "${copia.titulo}" — de ${copia.tutor.nombre} ${copia.tutor.apellido}`);
    }
    console.log(
      "  Siguen funcionando: el crédito al autor se guarda como texto, no como\n" +
        "  relación, justamente para esto (US47). Sus archivos de Storage también\n" +
        "  son copias propias."
    );
  }

  if (!confirmar) {
    console.log("\nNada se borró. Agrega --confirmar si es lo que quieres.\n");
    return;
  }

  // En orden de claves foráneas, igual que `cursos-de-tecnologia.ts`.
  for (const curso of cursos) {
    const contenidos = await prisma.contents.findMany({
      where: { courseId: curso.id },
      select: { id: true },
    });
    const idsContenidos = contenidos.map((c: { id: string }) => c.id);

    const documentos = await prisma.documents.findMany({
      where: { contentId: { in: idsContenidos } },
      select: { archivo: true },
    });

    if (documentos.length > 0) {
      const paths = documentos.map((d: { archivo: string }) => d.archivo);
      const { error } = await supabaseAdmin.storage.from(BUCKET_DOCUMENTOS).remove(paths);
      if (error) console.warn(`  Aviso al borrar archivos de Storage: ${error.message}`);
    }

    const actividades = await prisma.actividades.findMany({
      where: { courseId: curso.id },
      select: { id: true },
    });
    const quizzes = await prisma.quizzes.findMany({
      where: { courseId: curso.id },
      select: { id: true },
    });
    const preguntas = await prisma.preguntasQuiz.findMany({
      where: { quizId: { in: quizzes.map((q: { id: string }) => q.id) } },
      select: { id: true },
    });

    await prisma.contentViews.deleteMany({ where: { contentId: { in: idsContenidos } } });
    await prisma.documents.deleteMany({ where: { contentId: { in: idsContenidos } } });
    await prisma.entregas.deleteMany({
      where: { actividadId: { in: actividades.map((a: { id: string }) => a.id) } },
    });
    await prisma.intentosQuiz.deleteMany({
      where: { quizId: { in: quizzes.map((q: { id: string }) => q.id) } },
    });
    await prisma.opcionesQuiz.deleteMany({
      where: { preguntaId: { in: preguntas.map((p: { id: string }) => p.id) } },
    });
    await prisma.preguntasQuiz.deleteMany({
      where: { quizId: { in: quizzes.map((q: { id: string }) => q.id) } },
    });
    await prisma.quizzes.deleteMany({ where: { courseId: curso.id } });
    await prisma.actividades.deleteMany({ where: { courseId: curso.id } });
    await prisma.contents.deleteMany({ where: { courseId: curso.id } });
    await prisma.secciones.deleteMany({ where: { courseId: curso.id } });
    await prisma.rutaCursos.deleteMany({ where: { courseId: curso.id } });
    await prisma.courseUsers.deleteMany({ where: { courseId: curso.id } });
    await prisma.courses.delete({ where: { id: curso.id } });
    console.log(`  Borrado el curso "${curso.titulo}"`);
  }

  // Si al probar se le armó alguna ruta al tutor de prueba, hay que llevársela
  // también: `Rutas.tutorId` sí es una clave foránea, así que borrar la cuenta
  // con una ruta colgando fallaría con un error que no dice nada útil.
  if (tutor) {
    const rutas = await prisma.rutas.findMany({
      where: { tutorId: tutor.id },
      select: { id: true, titulo: true },
    });
    const idsRutas = rutas.map((r: { id: string }) => r.id);

    if (idsRutas.length > 0) {
      await prisma.rutaUsuarios.deleteMany({ where: { rutaId: { in: idsRutas } } });
      await prisma.rutaCursos.deleteMany({ where: { rutaId: { in: idsRutas } } });
      await prisma.rutas.deleteMany({ where: { id: { in: idsRutas } } });
      for (const ruta of rutas) console.log(`  Borrada la ruta "${ruta.titulo}"`);
    }
  }

  for (const usuario of [estudiante, tutor]) {
    if (!usuario) continue;
    await prisma.contentViews.deleteMany({ where: { userId: usuario.id } });
    await prisma.entregas.deleteMany({ where: { userId: usuario.id } });
    await prisma.intentosQuiz.deleteMany({ where: { userId: usuario.id } });
    await prisma.courseUsers.deleteMany({ where: { userId: usuario.id } });
    await prisma.rutaUsuarios.deleteMany({ where: { userId: usuario.id } });
    await prisma.users.delete({ where: { id: usuario.id } });
    if (usuario.authId) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(usuario.authId);
      if (error) console.warn(`  Aviso al borrar en Auth: ${error.message}`);
    }
    console.log(`  Borrada la cuenta ${usuario.email}`);
  }

  if (espacio) {
    const quedan = await prisma.users.count({ where: { espacioId: espacio.id } });
    if (quedan === 0) {
      await prisma.espacios.delete({ where: { id: espacio.id } });
      console.log(`  Borrado el espacio "${espacio.nombre}"`);
    } else {
      console.log(
        `  El espacio "${espacio.nombre}" NO se borró: todavía tiene ${quedan} usuario(s).`
      );
    }
  }

  console.log("\nListo.\n");
}

async function main() {
  if (borrar) {
    await borrarTodo();
    return;
  }

  if (crear) {
    await crearTodo();
    return;
  }

  await informar();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
