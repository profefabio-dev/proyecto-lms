// Borra los cursos de prueba y siembra tres cursos de tecnología de verdad
// (21/11/2026, a pedido del docente: "lo que se ha subido hasta el momento es
// únicamente de prueba, por lo tanto son cursos sin sentido").
//
// Los tres cursos usan TODO lo que la plataforma sabe manejar hoy:
// secciones con sus tres estados, los cinco tipos de contenido (video, texto,
// documento, enlace y código), contenido oculto, actividades evaluables con
// fecha límite, evaluaciones automáticas —una con límite de intentos— y, al
// final, una ruta de aprendizaje publicada que encadena los tres.
//
//   npx tsx scripts/cursos-de-tecnologia.ts                 (solo informa, no toca nada)
//   npx tsx scripts/cursos-de-tecnologia.ts --borrar        (lista qué borraría)
//   npx tsx scripts/cursos-de-tecnologia.ts --borrar --confirmar
//   npx tsx scripts/cursos-de-tecnologia.ts --crear
//   npx tsx scripts/cursos-de-tecnologia.ts --crear --sin-inscribir
//   npx tsx scripts/cursos-de-tecnologia.ts --crear --tutor=correo@del.tutor
//
// El borrado NUNCA toca cuentas de usuario: solo cursos y lo que cuelga de
// ellos. Y exige `--confirmar` aparte, porque se lleva por delante entregas y
// notas de estudiantes si las hubiera.

import { randomUUID } from "node:crypto";
import {
  Rol,
  TipoContenido,
  EstadoSeccion,
  EstadoCurso,
  EstadoRuta,
  EstadoUsuario,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { supabaseAdmin } from "../lib/supabase/admin";
import { BUCKET_DOCUMENTOS } from "../lib/supabase/storage";
import { componerCodigo } from "../lib/code-content";

const args = process.argv.slice(2);
const borrar = args.includes("--borrar");
const crear = args.includes("--crear");
const confirmar = args.includes("--confirmar");
const sinInscribir = args.includes("--sin-inscribir");
const tutorPedido = args.find((a) => a.startsWith("--tutor="))?.split("=")[1];

// ---------------------------------------------------------------------------
// REVISA ESTOS ENLACES ANTES DE CORRER EL SCRIPT
//
// Son los videos de YouTube que quedarán en los cursos. Los dejé como punto de
// partida, pero **tú conoces mejor que nadie cuáles usas en clase**: cámbialos
// por los tuyos aquí y el resto del script se encarga. Si un enlace estuviera
// caído, el curso igual se crea y solo ese reproductor saldría vacío.
// ---------------------------------------------------------------------------
const VIDEOS = {
  hardwareSoftware: "https://www.youtube.com/watch?v=0ofN2x0C2vk",
  sistemaOperativo: "https://www.youtube.com/watch?v=_C5AHaS1mOA",
  huellaDigital: "https://www.youtube.com/watch?v=4P_gj3oRn8s",
  contrasenas: "https://www.youtube.com/watch?v=3NjQ9b3pgIg",
  pensamientoComputacional: "https://www.youtube.com/watch?v=sxUJKn6TJOI",
  primerPrograma: "https://www.youtube.com/watch?v=chPhlsHoEPo",
};

type DefinicionContenido = {
  titulo: string;
  descripcion?: string;
  tipo: "VIDEO" | "TEXTO" | "ENLACE" | "CODIGO" | "DOCUMENTO";
  /** URL, Markdown o código según el tipo. Para DOCUMENTO se ignora. */
  cuerpo?: string;
  /** Solo para CODIGO. */
  lenguaje?: string;
  /** Solo para DOCUMENTO: el texto que llevará el PDF generado. */
  pdf?: string;
  seccion: number;
  visible?: boolean;
};

type DefinicionCurso = {
  titulo: string;
  descripcion: string;
  imagen: string;
  secciones: { titulo: string; estado: "DISPONIBLE" | "NO_DISPONIBLE"; esActual?: boolean }[];
  contenidos: DefinicionContenido[];
  actividades: {
    titulo: string;
    descripcion: string;
    instrucciones: string;
    puntajeMaximo: number;
    diasDePlazo: number;
    seccion: number;
  }[];
  quizzes: {
    titulo: string;
    descripcion: string;
    intentosMaximos: number | null;
    seccion: number;
    preguntas: { enunciado: string; opciones: string[]; correcta: number }[];
  }[];
};

const CURSOS: DefinicionCurso[] = [
  // =========================================================================
  {
    titulo: "Fundamentos de la informática",
    descripcion:
      "Cómo está hecho por dentro un computador, qué lo hace funcionar y cómo cuidarlo. El punto de partida para todo lo demás: al terminar sabrás nombrar cada parte, distinguir hardware de software y moverte con soltura en el sistema operativo.",
    imagen: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=1200",
    secciones: [
      { titulo: "Semana 1 — El computador por dentro", estado: "DISPONIBLE", esActual: true },
      { titulo: "Semana 2 — Software y sistema operativo", estado: "DISPONIBLE" },
      { titulo: "Semana 3 — Redes y almacenamiento", estado: "NO_DISPONIBLE" },
    ],
    contenidos: [
      {
        titulo: "Hardware y software: la diferencia",
        descripcion: "Lo que se toca y lo que no. Diez minutos para no volver a confundirlos.",
        tipo: "VIDEO",
        cuerpo: VIDEOS.hardwareSoftware,
        seccion: 0,
      },
      {
        titulo: "Las partes del computador",
        descripcion: "Lectura con el nombre y la función de cada pieza.",
        tipo: "TEXTO",
        seccion: 0,
        cuerpo: [
          "## Las cuatro funciones de todo computador",
          "",
          "Por dentro, cualquier computador —desde el del salón hasta tu celular— hace siempre lo mismo:",
          "",
          "1. **Entrada**: recibe datos (teclado, mouse, micrófono, cámara).",
          "2. **Proceso**: los transforma (el procesador o CPU).",
          "3. **Almacenamiento**: los guarda (memoria RAM y disco).",
          "4. **Salida**: los muestra (pantalla, parlantes, impresora).",
          "",
          "## Las piezas que vas a encontrar",
          "",
          "| Pieza | Para qué sirve |",
          "|---|---|",
          "| Procesador (CPU) | Hace los cálculos. Es el cerebro. |",
          "| Memoria RAM | Guarda lo que estás usando *ahora*. Se borra al apagar. |",
          "| Disco duro o SSD | Guarda lo que debe quedar: tus archivos y los programas. |",
          "| Tarjeta madre | La tabla donde todo se conecta. |",
          "| Fuente de poder | Convierte la corriente de la pared en la que usan las piezas. |",
          "",
          "## Dos ideas que se confunden siempre",
          "",
          "- **RAM no es lo mismo que disco.** La RAM es tu escritorio mientras trabajas; el disco es el archivador. Por eso, si no guardas y se va la luz, pierdes lo que estaba en el escritorio.",
          "- **Más memoria no es más velocidad**, no siempre. Un computador va lento por la pieza que esté más apretada, no por la que más grande tenga.",
          "",
          "> Al terminar la semana deberías poder abrir un computador de mesa (apagado y desconectado) y señalar cada una de estas piezas.",
        ].join("\n"),
      },
      {
        titulo: "Guía de partes del computador",
        descripcion: "Documento para imprimir y llenar mientras observas un equipo real.",
        tipo: "DOCUMENTO",
        pdf: "Guia de partes del computador - Fundamentos de la informatica",
        seccion: 0,
      },
      {
        titulo: "Simulador: arma un computador pieza por pieza",
        descripcion: "Recurso externo. Practica el ensamble sin riesgo de dañar nada.",
        tipo: "ENLACE",
        cuerpo: "https://edu.gcfglobal.org/es/informatica-basica/",
        seccion: 0,
      },
      {
        titulo: "Qué hace un sistema operativo",
        descripcion: "Windows, Linux y Android hacen lo mismo de formas distintas.",
        tipo: "VIDEO",
        cuerpo: VIDEOS.sistemaOperativo,
        seccion: 1,
      },
      {
        titulo: "Comandos básicos de la terminal",
        descripcion: "Lo mismo que haces con el mouse, escrito. Útil cuando no hay interfaz.",
        tipo: "CODIGO",
        lenguaje: "bash",
        seccion: 1,
        cuerpo: [
          "# Ver en qué carpeta estoy",
          "pwd",
          "",
          "# Listar lo que hay aquí",
          "ls",
          "",
          "# Entrar a una carpeta y volver",
          "cd Documentos",
          "cd ..",
          "",
          "# Crear una carpeta y un archivo vacío",
          "mkdir tareas",
          'echo "" > tareas/apuntes.txt',
        ].join("\n"),
      },
      {
        titulo: "Borrador: cómo se conecta una red local",
        descripcion: "Material de la semana 3, todavía sin terminar.",
        tipo: "TEXTO",
        cuerpo: "Pendiente de redactar. Este contenido está oculto a propósito.",
        seccion: 2,
        visible: false,
      },
    ],
    actividades: [
      {
        titulo: "Identifica las partes de tu computador",
        descripcion: "Entrega con fotos o por escrito.",
        puntajeMaximo: 100,
        diasDePlazo: 7,
        seccion: 0,
        instrucciones: [
          "## Qué tienes que hacer",
          "",
          "Observa un computador al que tengas acceso (el de tu casa, el de la sala de sistemas o incluso tu celular) e identifica **al menos cinco partes**.",
          "",
          "Por cada una escribe:",
          "",
          "1. Cómo se llama.",
          "2. Para qué sirve, en tus propias palabras.",
          "3. Si es hardware de entrada, de salida, de proceso o de almacenamiento.",
          "",
          "## Cómo entregar",
          "",
          "Puedes **escribir aquí mismo**, **adjuntar un archivo** (una foto del cuaderno sirve) o las dos cosas.",
          "",
          "## Cómo se califica",
          "",
          "| Criterio | Puntos |",
          "|---|---|",
          "| Identifica cinco partes o más | 40 |",
          "| Explica la función de cada una con sus palabras | 40 |",
          "| Clasifica correctamente entrada / salida / proceso / almacenamiento | 20 |",
        ].join("\n"),
      },
    ],
    quizzes: [
      {
        titulo: "Repaso: hardware y software",
        descripcion: "Cuatro preguntas para comprobar lo de la semana 1.",
        intentosMaximos: 2,
        seccion: 0,
        preguntas: [
          {
            enunciado: "¿Cuál de estos es un ejemplo de software?",
            opciones: ["El teclado", "El navegador web", "La memoria RAM", "La pantalla"],
            correcta: 1,
          },
          {
            enunciado: "¿Qué pasa con lo que está en la memoria RAM cuando se apaga el computador?",
            opciones: [
              "Se guarda automáticamente en el disco",
              "Se pierde",
              "Se envía a la nube",
              "Se queda igual hasta que lo borres",
            ],
            correcta: 1,
          },
          {
            enunciado: "El mouse es un dispositivo de...",
            opciones: ["Salida", "Entrada", "Almacenamiento", "Proceso"],
            correcta: 1,
          },
          {
            enunciado: "¿Cuál es la función del procesador?",
            opciones: [
              "Guardar los archivos de forma permanente",
              "Mostrar la imagen en pantalla",
              "Hacer los cálculos y ejecutar las instrucciones",
              "Conectar el computador a internet",
            ],
            correcta: 2,
          },
        ],
      },
    ],
  },

  // =========================================================================
  {
    titulo: "Ciudadanía digital y seguridad en internet",
    descripcion:
      "Lo que haces en internet deja rastro y tiene consecuencias. Este curso es sobre cuidarte y cuidar a los demás en línea: tu huella digital, contraseñas que sirvan, cómo reconocer una estafa y qué hacer frente al acoso.",
    imagen: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200",
    secciones: [
      { titulo: "Semana 1 — Tu huella digital", estado: "DISPONIBLE", esActual: true },
      { titulo: "Semana 2 — Contraseñas y estafas", estado: "DISPONIBLE" },
      { titulo: "Semana 3 — Derechos de autor y licencias", estado: "NO_DISPONIBLE" },
    ],
    contenidos: [
      {
        titulo: "Qué es la huella digital",
        descripcion: "Todo lo que internet sabe de ti sin que se lo hayas dicho directamente.",
        tipo: "VIDEO",
        cuerpo: VIDEOS.huellaDigital,
        seccion: 0,
      },
      {
        titulo: "Tu rastro en internet",
        descripcion: "Lectura corta, con una actividad de autoevaluación al final.",
        tipo: "TEXTO",
        seccion: 0,
        cuerpo: [
          "## Dos huellas, no una",
          "",
          "- **La huella que dejas a propósito**: lo que publicas, comentas y compartes.",
          "- **La que dejas sin darte cuenta**: qué buscaste, desde dónde te conectaste, cuánto tiempo viste un video, qué le diste *me gusta*.",
          "",
          "La segunda suele ser mucho más grande que la primera, y es la que usan las plataformas para decidir qué mostrarte.",
          "",
          "## Tres cosas que conviene tener claras",
          "",
          "1. **Lo que se publica es difícil de borrar.** Aunque borres el original, otros pudieron guardar una copia.",
          "2. **\"Gratis\" casi nunca es gratis.** Si no pagas con dinero, el producto suelen ser tus datos.",
          "3. **Tu nombre es tu carta de presentación.** Dentro de unos años alguien va a buscarte para un cupo o un trabajo.",
          "",
          "## Revísate",
          "",
          "Busca tu nombre completo en un buscador, entre comillas. ¿Qué aparece? ¿Lo publicaste tú?",
        ].join("\n"),
      },
      {
        titulo: "Interland: juega y aprende a ser seguro en internet",
        descripcion: "Recurso externo. Cuatro mundos, cada uno sobre un riesgo distinto.",
        tipo: "ENLACE",
        cuerpo: "https://beinternetawesome.withgoogle.com/es_es/interland",
        seccion: 0,
      },
      {
        titulo: "Cómo reconocer una contraseña débil",
        descripcion: "Un programa corto que revisa una contraseña y dice qué le falta.",
        tipo: "CODIGO",
        lenguaje: "python",
        seccion: 1,
        cuerpo: [
          "def revisar(clave):",
          '    """Devuelve la lista de cosas que le faltan a una contraseña."""',
          "    problemas = []",
          "",
          "    if len(clave) < 12:",
          '        problemas.append("Es corta: debería tener al menos 12 caracteres")',
          "    if clave.islower() or clave.isupper():",
          '        problemas.append("Le faltan mayúsculas o minúsculas")',
          "    if not any(c.isdigit() for c in clave):",
          '        problemas.append("No tiene números")',
          '    if clave.lower() in ("123456", "password", "qwerty", "colombia"):',
          '        problemas.append("Está en la lista de las más usadas del mundo")',
          "",
          "    return problemas or [\"Se ve bien\"]",
          "",
          "",
          'for resultado in revisar("colegio2024"):',
          "    print(resultado)",
        ].join("\n"),
      },
      {
        titulo: "Señales de una estafa por internet",
        descripcion: "Video sobre phishing y mensajes falsos.",
        tipo: "VIDEO",
        cuerpo: VIDEOS.contrasenas,
        seccion: 1,
      },
      {
        titulo: "Guía: qué hacer frente al ciberacoso",
        descripcion: "Pasos concretos y a quién acudir.",
        tipo: "DOCUMENTO",
        pdf: "Que hacer frente al ciberacoso - Guia para estudiantes",
        seccion: 1,
      },
    ],
    actividades: [
      {
        titulo: "Audita tu propia seguridad",
        descripcion: "Entrega por escrito. No incluyas tus contraseñas reales.",
        puntajeMaximo: 50,
        diasDePlazo: 10,
        seccion: 1,
        instrucciones: [
          "## Qué tienes que hacer",
          "",
          "Revisa tus propias costumbres en internet y responde con honestidad. **No escribas ninguna contraseña real** en la entrega.",
          "",
          "1. ¿Usas la misma contraseña en más de un sitio? ¿En cuántos, más o menos?",
          "2. Busca tu nombre en un buscador. ¿Qué encontraste? ¿Hay algo que preferirías que no estuviera?",
          "3. Elige **una** cosa que vas a cambiar esta semana y explica por qué.",
          "",
          "## Cómo se califica",
          "",
          "| Criterio | Puntos |",
          "|---|---|",
          "| Responde las tres preguntas | 20 |",
          "| La reflexión es propia y concreta, no copiada | 20 |",
          "| El cambio que propone es realista | 10 |",
        ].join("\n"),
      },
    ],
    quizzes: [
      {
        titulo: "¿Qué tan seguro navegas?",
        descripcion: "Sin límite de intentos: repítelo hasta que te quede claro.",
        intentosMaximos: null,
        seccion: 1,
        preguntas: [
          {
            enunciado: "Recibes un correo de tu banco pidiendo tu clave por un problema urgente. ¿Qué haces?",
            opciones: [
              "Respondo rápido para no perder la cuenta",
              "No respondo y entro al banco por mi cuenta, escribiendo la dirección yo mismo",
              "Reenvío el correo a un amigo para preguntarle",
              "Hago clic en el enlace para revisar si es real",
            ],
            correcta: 1,
          },
          {
            enunciado: "¿Cuál de estas contraseñas es más segura?",
            opciones: ["Juan2010", "123456789", "perroazulcome42lunas", "qwerty"],
            correcta: 2,
          },
          {
            enunciado: "Un compañero te comparte una foto burlándose de otro. ¿Qué es lo correcto?",
            opciones: [
              "Reenviarla solo a quienes aparecen en ella",
              "No reenviarla y avisarle a un adulto de confianza",
              "Guardarla por si acaso",
              "Comentarla para que sepan que no estás de acuerdo",
            ],
            correcta: 1,
          },
          {
            enunciado: "La huella digital que dejas sin darte cuenta incluye...",
            opciones: [
              "Solo lo que publicas en redes",
              "Nada, si tienes el perfil privado",
              "Lo que buscas, desde dónde te conectas y cuánto tiempo ves algo",
              "Únicamente tus mensajes privados",
            ],
            correcta: 2,
          },
        ],
      },
    ],
  },

  // =========================================================================
  {
    titulo: "Pensamiento computacional y programación con Python",
    descripcion:
      "Aprender a resolver problemas como lo haría una máquina: dividirlos, encontrar el patrón y escribir los pasos. Primero sin computador, después con Python. Al terminar vas a tener tus primeros programas funcionando.",
    imagen: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=1200",
    secciones: [
      { titulo: "Semana 1 — Pensar antes de programar", estado: "DISPONIBLE", esActual: true },
      { titulo: "Semana 2 — Tus primeros programas", estado: "DISPONIBLE" },
      { titulo: "Semana 3 — Condicionales y ciclos", estado: "NO_DISPONIBLE" },
    ],
    contenidos: [
      {
        titulo: "Qué es el pensamiento computacional",
        descripcion: "No se trata de computadores, se trata de cómo piensas.",
        tipo: "VIDEO",
        cuerpo: VIDEOS.pensamientoComputacional,
        seccion: 0,
      },
      {
        titulo: "Las cuatro herramientas para resolver un problema",
        descripcion: "Descomponer, reconocer patrones, abstraer y escribir el algoritmo.",
        tipo: "TEXTO",
        seccion: 0,
        cuerpo: [
          "## El método",
          "",
          "Un problema grande casi nunca se resuelve de frente. Se resuelve así:",
          "",
          "1. **Descomponer** — pártelo en problemas más pequeños. *\"Organizar la fiesta\"* son en realidad ocho tareas distintas.",
          "2. **Reconocer patrones** — busca lo que se repite. Si tres de esas tareas se hacen igual, resuélvelas de una sola forma.",
          "3. **Abstraer** — quédate con lo importante y bota el resto. Para calcular la nota final no importa el color del cuaderno.",
          "4. **Escribir el algoritmo** — los pasos, en orden, sin ambigüedades.",
          "",
          "## Un algoritmo que ya conoces",
          "",
          "Preparar una arepa:",
          "",
          "```",
          "1. Mezclar harina, agua y sal",
          "2. Amasar hasta que no se pegue",
          "3. Formar las bolas",
          "4. Aplanarlas",
          "5. Poner al fogón 5 minutos por lado",
          "```",
          "",
          "Fíjate en el paso 2: *\"hasta que no se pegue\"* es un **ciclo**, y *\"si está muy seca, agregar agua\"* sería un **condicional**. Ya piensas en esas estructuras; programar es solo escribirlas de una forma que la máquina entienda.",
        ].join("\n"),
      },
      {
        titulo: "Programiz: escribe Python sin instalar nada",
        descripcion: "Recurso externo. Ábrelo en otra pestaña y prueba los ejemplos del curso.",
        tipo: "ENLACE",
        cuerpo: "https://www.programiz.com/python-programming/online-compiler/",
        seccion: 0,
      },
      {
        titulo: "Tu primer programa",
        descripcion: "Tres líneas que ya hacen algo útil.",
        tipo: "CODIGO",
        lenguaje: "python",
        seccion: 1,
        cuerpo: [
          "# Un programa es una conversación: pregunta, calcula y responde.",
          "",
          'nombre = input("¿Cómo te llamas? ")',
          'edad = int(input("¿Cuántos años tienes? "))',
          "",
          'print(f"Hola {nombre}. En 2030 vas a tener {edad + (2030 - 2026)} años.")',
        ].join("\n"),
      },
      {
        titulo: "Variables y tipos de dato",
        descripcion: "Por qué 'int(...)' aparece en el ejemplo anterior.",
        tipo: "CODIGO",
        lenguaje: "python",
        seccion: 1,
        cuerpo: [
          "# Una variable es una caja con nombre. El tipo dice qué cabe adentro.",
          "",
          'nombre = "Salomé"        # texto (str)',
          "edad = 13                # número entero (int)",
          "promedio = 4.2           # número con decimales (float)",
          "aprobo = True            # verdadero o falso (bool)",
          "",
          "# Ojo con esto: no es lo mismo el texto \"13\" que el número 13.",
          'print("13" + "13")       # imprime 1313  (pega dos textos)',
          "print(13 + 13)           # imprime 26    (suma dos números)",
          "",
          "# Por eso en el programa anterior hubo que convertir con int():",
          "# lo que escribe el usuario siempre llega como texto.",
        ].join("\n"),
      },
      {
        titulo: "Guía de ejercicios de la semana 2",
        descripcion: "Diez ejercicios cortos, de menor a mayor dificultad.",
        tipo: "DOCUMENTO",
        pdf: "Ejercicios de Python - Semana 2 - Variables y entrada de datos",
        seccion: 1,
      },
      {
        titulo: "Borrador: el ciclo for explicado con ejemplos",
        descripcion: "Material de la semana 3, aún en preparación.",
        tipo: "TEXTO",
        cuerpo: "Pendiente de redactar. Este contenido está oculto a propósito.",
        seccion: 2,
        visible: false,
      },
    ],
    actividades: [
      {
        titulo: "Escribe el algoritmo de algo que haces a diario",
        descripcion: "Sin computador. Primero se piensa, después se programa.",
        puntajeMaximo: 100,
        diasDePlazo: 7,
        seccion: 0,
        instrucciones: [
          "## Qué tienes que hacer",
          "",
          "Elige algo que hagas todos los días —alistarte para el colegio, preparar algo de comer, llegar a tu casa— y escribe su **algoritmo**.",
          "",
          "Requisitos:",
          "",
          "- Mínimo **ocho pasos**, en orden.",
          "- Al menos **un condicional** (\"si pasa X, entonces...\").",
          "- Al menos **un ciclo** (\"repetir hasta que...\").",
          "",
          "## La prueba de fuego",
          "",
          "Dáselo a alguien que no sepa hacer esa tarea y pídele que siga los pasos **al pie de la letra**, sin suponer nada. Donde se trabe, ahí te faltó un paso. Cuéntame qué pasó.",
          "",
          "## Cómo se califica",
          "",
          "| Criterio | Puntos |",
          "|---|---|",
          "| Ocho pasos o más, en orden lógico | 30 |",
          "| Incluye un condicional bien planteado | 25 |",
          "| Incluye un ciclo bien planteado | 25 |",
          "| Cuenta qué pasó al probarlo con otra persona | 20 |",
        ].join("\n"),
      },
      {
        titulo: "Tu primer programa en Python",
        descripcion: "Adjunta el archivo .py o pega el código.",
        puntajeMaximo: 100,
        diasDePlazo: 14,
        seccion: 1,
        instrucciones: [
          "## Qué tienes que hacer",
          "",
          "Escribe un programa en Python que:",
          "",
          "1. Le pregunte al usuario **tres notas**.",
          "2. Calcule el **promedio**.",
          "3. Diga si **aprobó** (3.0 o más) o no.",
          "",
          "## Pistas",
          "",
          "- Usa `input()` para preguntar y `float()` para convertir a número con decimales.",
          "- Para el punto 3 vas a necesitar un `if`. Búscalo: parte de programar es aprender a buscar.",
          "",
          "## Cómo entregar",
          "",
          "Adjunta el archivo `.py`, o pega el código aquí mismo. **Dime también qué fue lo que más te costó** — eso me sirve para la clase siguiente.",
        ].join("\n"),
      },
    ],
    quizzes: [
      {
        titulo: "Repaso: variables y tipos de dato",
        descripcion: "Tres intentos. Te queda el mejor.",
        intentosMaximos: 3,
        seccion: 1,
        preguntas: [
          {
            enunciado: '¿Qué imprime este código?   print("5" + "5")',
            opciones: ["10", "55", "Un error", '"10"'],
            correcta: 1,
          },
          {
            enunciado: "¿Para qué sirve int() alrededor de un input()?",
            opciones: [
              "Para que el texto se vea más bonito",
              "Para convertir a número lo que el usuario escribió, que siempre llega como texto",
              "Para que el programa corra más rápido",
              "Para que el usuario no pueda escribir letras",
            ],
            correcta: 1,
          },
          {
            enunciado: "En pensamiento computacional, 'descomponer' significa...",
            opciones: [
              "Borrar lo que no sirve",
              "Partir un problema grande en problemas más pequeños",
              "Escribir el programa en varios archivos",
              "Buscar errores en el código",
            ],
            correcta: 1,
          },
          {
            enunciado: "¿Cuál de estas variables guarda un número con decimales?",
            opciones: ["edad = 13", "nombre = 'Ana'", "promedio = 4.2", "aprobo = True"],
            correcta: 2,
          },
        ],
      },
    ],
  },
];

// Un PDF mínimo y válido, escrito a mano: evita depender de una librería solo
// para tener un archivo de verdad que descargar desde la plataforma.
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

async function borrarTodosLosCursos() {
  const cursos = await prisma.courses.findMany({
    include: {
      tutor: { select: { nombre: true, apellido: true } },
      _count: { select: { inscritos: true, contenidos: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (cursos.length === 0) {
    console.log("No hay cursos que borrar.");
    return;
  }

  const idsCursos = cursos.map((c: { id: string }) => c.id);

  const [entregas, documentos] = await Promise.all([
    prisma.entregas.findMany({
      where: { actividad: { courseId: { in: idsCursos } } },
      select: { archivo: true },
    }),
    prisma.documents.findMany({
      where: { content: { courseId: { in: idsCursos } } },
      select: { archivo: true },
    }),
  ]);

  console.log(`\nSe borrarían ${cursos.length} curso(s):\n`);
  for (const curso of cursos) {
    console.log(
      `  - ${curso.titulo}  (${curso.estado}, ${curso._count.contenidos} contenidos, ` +
        `${curso._count.inscritos} inscritos, de ${curso.tutor.nombre} ${curso.tutor.apellido})`
    );
  }
  console.log(
    `\nY con ellos: ${documentos.length} documento(s) y ${entregas.length} entrega(s) con sus notas.`
  );
  console.log("Las cuentas de usuario NO se tocan.\n");

  if (!confirmar) {
    console.log("Esto fue solo una simulación. Para borrar de verdad:");
    console.log("   npx tsx scripts/cursos-de-tecnologia.ts --borrar --confirmar\n");
    return;
  }

  // Los archivos de Storage primero: si se borran las filas antes, se pierde
  // la referencia y quedan huérfanos ocupando espacio para siempre.
  const archivos = [
    ...documentos.map((d: { archivo: string }) => d.archivo),
    ...entregas
      .map((e: { archivo: string | null }) => e.archivo)
      .filter((a: string | null): a is string => Boolean(a)),
  ];
  if (archivos.length > 0) {
    await supabaseAdmin.storage.from(BUCKET_DOCUMENTOS).remove(archivos);
    console.log(`Borrados ${archivos.length} archivo(s) de Storage.`);
  }

  const contenidos = await prisma.contents.findMany({
    where: { courseId: { in: idsCursos } },
    select: { id: true },
  });
  const actividades = await prisma.actividades.findMany({
    where: { courseId: { in: idsCursos } },
    select: { id: true },
  });
  const quizzes = await prisma.quizzes.findMany({
    where: { courseId: { in: idsCursos } },
    select: { id: true },
  });
  const preguntas = await prisma.preguntasQuiz.findMany({
    where: { quizId: { in: quizzes.map((q: { id: string }) => q.id) } },
    select: { id: true },
  });

  const idsContenidos = contenidos.map((c: { id: string }) => c.id);
  const idsActividades = actividades.map((a: { id: string }) => a.id);
  const idsQuizzes = quizzes.map((q: { id: string }) => q.id);
  const idsPreguntas = preguntas.map((p: { id: string }) => p.id);

  // De la hoja a la raíz, respetando las claves foráneas.
  await prisma.$transaction([
    prisma.contentViews.deleteMany({ where: { contentId: { in: idsContenidos } } }),
    prisma.documents.deleteMany({ where: { contentId: { in: idsContenidos } } }),
    prisma.entregas.deleteMany({ where: { actividadId: { in: idsActividades } } }),
    prisma.intentosQuiz.deleteMany({ where: { quizId: { in: idsQuizzes } } }),
    prisma.opcionesQuiz.deleteMany({ where: { preguntaId: { in: idsPreguntas } } }),
    prisma.preguntasQuiz.deleteMany({ where: { quizId: { in: idsQuizzes } } }),
    prisma.quizzes.deleteMany({ where: { courseId: { in: idsCursos } } }),
    prisma.actividades.deleteMany({ where: { courseId: { in: idsCursos } } }),
    prisma.contents.deleteMany({ where: { courseId: { in: idsCursos } } }),
    prisma.secciones.deleteMany({ where: { courseId: { in: idsCursos } } }),
    prisma.rutaCursos.deleteMany({ where: { courseId: { in: idsCursos } } }),
    prisma.courseUsers.deleteMany({ where: { courseId: { in: idsCursos } } }),
    prisma.courses.deleteMany({ where: { id: { in: idsCursos } } }),
  ]);

  console.log(`\nListo: ${cursos.length} curso(s) borrado(s). Ninguna cuenta fue eliminada.\n`);
}

async function crearCursos() {
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
  console.log(`Tutor: ${tutor.nombre} ${tutor.apellido} <${tutor.email}>\n`);

  const estudiantes = sinInscribir
    ? []
    : await prisma.users.findMany({
        where: { rol: Rol.ESTUDIANTE, estado: EstadoUsuario.ACTIVO },
        select: { id: true },
      });

  const cursosCreados: { id: string; titulo: string }[] = [];

  for (const definicion of CURSOS) {
    const yaExiste = await prisma.courses.findFirst({ where: { titulo: definicion.titulo } });
    if (yaExiste) {
      console.log(`Ya existe "${definicion.titulo}", lo salto.`);
      cursosCreados.push({ id: yaExiste.id, titulo: yaExiste.titulo });
      continue;
    }

    const curso = await prisma.courses.create({
      data: {
        titulo: definicion.titulo,
        descripcion: definicion.descripcion,
        imagen: definicion.imagen,
        tutorId: tutor.id,
        estado: EstadoCurso.PUBLICADO,
      },
    });

    const secciones = [];
    for (const [indice, s] of definicion.secciones.entries()) {
      secciones.push(
        await prisma.secciones.create({
          data: {
            courseId: curso.id,
            titulo: s.titulo,
            orden: indice,
            estado:
              s.estado === "DISPONIBLE" ? EstadoSeccion.DISPONIBLE : EstadoSeccion.NO_DISPONIBLE,
            esActual: Boolean(s.esActual),
          },
        })
      );
    }

    let orden = 0;
    let documentosSubidos = 0;
    for (const c of definicion.contenidos) {
      const base = {
        courseId: curso.id,
        seccionId: secciones[c.seccion].id,
        titulo: c.titulo,
        descripcion: c.descripcion ?? null,
        orden: orden++,
        visible: c.visible !== false,
      };

      if (c.tipo === "DOCUMENTO") {
        // Si el bucket no existe o la subida falla, se avisa y se sigue: el
        // resto del curso no depende de este archivo.
        try {
          const path = `${curso.id}/${randomUUID()}-guia.pdf`;
          const { error } = await supabaseAdmin.storage
            .from(BUCKET_DOCUMENTOS)
            .upload(path, construirPdf(c.pdf ?? c.titulo), {
              contentType: "application/pdf",
              upsert: false,
            });
          if (error) throw new Error(error.message);

          await prisma.contents.create({
            data: {
              ...base,
              tipo: TipoContenido.DOCUMENTO,
              contenido: path,
              documentos: {
                create: { archivo: path, nombre: "guia.pdf", tipo: "application/pdf" },
              },
            },
          });
          documentosSubidos++;
        } catch (error) {
          console.warn(
            `   Aviso: no se pudo subir el PDF "${c.titulo}" (${
              error instanceof Error ? error.message : error
            }). El curso sí quedó creado.`
          );
          orden--;
        }
        continue;
      }

      const tipo =
        c.tipo === "VIDEO"
          ? TipoContenido.VIDEO
          : c.tipo === "TEXTO"
            ? TipoContenido.TEXTO
            : c.tipo === "ENLACE"
              ? TipoContenido.ENLACE
              : TipoContenido.CODIGO;

      await prisma.contents.create({
        data: {
          ...base,
          tipo,
          contenido:
            c.tipo === "CODIGO" ? componerCodigo(c.lenguaje ?? "", c.cuerpo ?? "") : c.cuerpo ?? "",
        },
      });
    }

    for (const [indice, a] of definicion.actividades.entries()) {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + a.diasDePlazo);

      await prisma.actividades.create({
        data: {
          courseId: curso.id,
          seccionId: secciones[a.seccion].id,
          titulo: a.titulo,
          descripcion: a.descripcion,
          instrucciones: a.instrucciones,
          puntajeMaximo: a.puntajeMaximo,
          fechaLimite,
          orden: indice,
          visible: true,
        },
      });
    }

    for (const [indice, q] of definicion.quizzes.entries()) {
      const quiz = await prisma.quizzes.create({
        data: {
          courseId: curso.id,
          seccionId: secciones[q.seccion].id,
          titulo: q.titulo,
          descripcion: q.descripcion,
          intentosMaximos: q.intentosMaximos,
          visible: true,
          orden: indice,
        },
      });

      for (const [posicion, p] of q.preguntas.entries()) {
        await prisma.preguntasQuiz.create({
          data: {
            quizId: quiz.id,
            enunciado: p.enunciado,
            orden: posicion,
            opciones: {
              create: p.opciones.map((texto, i) => ({
                texto,
                esCorrecta: i === p.correcta,
                orden: i,
              })),
            },
          },
        });
      }
    }

    if (estudiantes.length > 0) {
      await prisma.courseUsers.createMany({
        data: estudiantes.map((e: { id: string }) => ({ courseId: curso.id, userId: e.id })),
        skipDuplicates: true,
      });
    }

    cursosCreados.push({ id: curso.id, titulo: curso.titulo });
    console.log(
      `Creado: ${curso.titulo}\n` +
        `   ${definicion.secciones.length} secciones · ${definicion.contenidos.length} contenidos ` +
        `(${documentosSubidos} PDF subido(s)) · ${definicion.actividades.length} actividad(es) · ` +
        `${definicion.quizzes.length} evaluación(es) · ${estudiantes.length} estudiante(s) inscrito(s)`
    );
  }

  // La ruta de aprendizaje encadena los tres en el orden en que se cursan.
  const TITULO_RUTA = "Tecnología e Informática — recorrido completo";
  const rutaExistente = await prisma.rutas.findFirst({ where: { titulo: TITULO_RUTA } });

  if (!rutaExistente) {
    const ruta = await prisma.rutas.create({
      data: {
        titulo: TITULO_RUTA,
        descripcion:
          "El camino completo del área, en orden: primero entender la máquina, después usarla con criterio y seguridad, y por último hacerla trabajar para ti programándola.",
        tutorId: tutor.id,
        estado: EstadoRuta.PUBLICADA,
      },
    });

    for (const [indice, c] of cursosCreados.entries()) {
      await prisma.rutaCursos.create({
        data: { rutaId: ruta.id, courseId: c.id, orden: indice },
      });
    }

    console.log(`\nCreada la ruta "${TITULO_RUTA}" con los ${cursosCreados.length} cursos, publicada.`);
  } else {
    console.log(`\nLa ruta "${TITULO_RUTA}" ya existía, la dejo como está.`);
  }

  console.log("\nListo. Entra como tutor a /tutor/cursos para verlos.\n");
}

async function main() {
  if (!borrar && !crear) {
    const cursos = await prisma.courses.count();
    const estudiantes = await prisma.users.count({
      where: { rol: Rol.ESTUDIANTE, estado: EstadoUsuario.ACTIVO },
    });
    console.log(`\nHoy hay ${cursos} curso(s) y ${estudiantes} estudiante(s) activo(s).`);
    console.log("\nEste script no hizo nada. Lo que puedes pedirle:");
    console.log("   --borrar               lista qué cursos borraría (no borra)");
    console.log("   --borrar --confirmar   los borra de verdad");
    console.log("   --crear                crea los tres cursos de tecnología y su ruta\n");
    return;
  }

  if (borrar) {
    await borrarTodosLosCursos();
  }

  if (crear) {
    await crearCursos();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
