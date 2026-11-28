/**
 * Bloque D.1 de `Checklist_Validacion_Manual.md`, automatizado (23/11/2026).
 *
 * La prueba manual era: copiar la URL de una lección de una sección que el
 * tutor tiene en "No disponible" y entrar directo, esperando un 404.
 *
 * Lo que se afirma aquí es la regla de fondo de US43: **no basta con que la
 * lección exista y esté `visible`, tiene que estar en la secuencia
 * accesible del curso.** Es la diferencia entre comprobar `visible` a mano
 * en un sitio —y olvidarlo en otro— y exigir que la lección pedida sea una
 * de las que el temario muestra. Por eso una lección visible dentro de una
 * sección cerrada también da 404.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * US56-A (28/11/2026): la pantalla lee el modo de lectura de una cookie, en
 * el servidor, antes de pintar. Sin este doble, `cookies()` revienta con
 * "was called outside a request scope" y se cae TODO el archivo — no solo
 * las pruebas nuevas.
 */
const falso = vi.hoisted(() => ({ cookies: {} as Record<string, string> }));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (nombre: string) =>
      nombre in falso.cookies ? { name: nombre, value: falso.cookies[nombre] } : undefined,
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/storage", () => ({
  crearUrlDescarga: vi.fn().mockResolvedValue("https://firmada.example/doc"),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findUnique: vi.fn() },
    courseUsers: { findFirst: vi.fn() },
    contentViews: { findMany: vi.fn() },
  },
}));

import LeccionEstudiantePage from "./page";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function mockSesion(authUserId: string | null) {
  (createClient as any).mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: authUserId ? { id: authUserId } : null } }),
    },
  });
}

function params(contenidoId: string) {
  return Promise.resolve({ courseId: "curso-1", contenidoId });
}

/**
 * Busca, en el árbol de elementos que devuelve la página, el primero que
 * tenga una prop con ese nombre, y devuelve sus props.
 *
 * Hace falta porque lo que se quiere afirmar es un **contrato entre la
 * página y el reproductor**: que el modo que el servidor leyó de la cookie
 * es el que recibe el reproductor. Los componentes hijos no se ejecutan
 * —`createElement` solo guarda el tipo y las props—, así que no sirve
 * espiarlos con un doble: hay que mirar el árbol.
 */
function propsConLaClave(nodo: unknown, clave: string): Record<string, unknown> | null {
  if (Array.isArray(nodo)) {
    for (const hijo of nodo) {
      const encontrado = propsConLaClave(hijo, clave);
      if (encontrado) return encontrado;
    }
    return null;
  }

  if (!nodo || typeof nodo !== "object") return null;

  const props = (nodo as { props?: Record<string, unknown> }).props;
  if (!props) return null;
  if (clave in props) return props;

  // Se recorren TODAS las props, no solo `children`: el reproductor recibe
  // la cabecera, el contenido, la navegación y el temario como props
  // sueltas (`content`, `header`, `navigation`, `sidebar`), así que mirar
  // solo `children` no llega al cuerpo de la lección.
  for (const valor of Object.values(props)) {
    const encontrado = propsConLaClave(valor, clave);
    if (encontrado) return encontrado;
  }

  return null;
}

/**
 * Un curso con dos secciones: la primera disponible con una lección
 * visible y otra oculta, y la segunda NO_DISPONIBLE con una lección que sí
 * está marcada como visible — ese es el caso interesante.
 */
function cursoConSeccionCerrada() {
  return {
    id: "curso-1",
    titulo: "Curso 1",
    // US42: la pantalla ahora compara el dueño del curso con el usuario.
    tutorId: "tutor-1",
    // US54 (27/11/2026): el conteo del glosario, para el enlace del temario.
    _count: { glosario: 0 },
    secciones: [
      { id: "s1", titulo: "Semana 1", orden: 0, estado: "DISPONIBLE", esActual: true },
      { id: "s2", titulo: "Semana 2", orden: 1, estado: "NO_DISPONIBLE", esActual: false },
    ],
    contenidos: [
      {
        id: "abierta",
        titulo: "Lección abierta",
        descripcion: null,
        tipo: "TEXTO",
        contenido: "Hola",
        orden: 0,
        visible: true,
        seccionId: "s1",
        documentos: [],
      },
      {
        id: "oculta",
        titulo: "Lección oculta",
        descripcion: null,
        tipo: "TEXTO",
        contenido: "Secreto",
        orden: 1,
        visible: false,
        seccionId: "s1",
        documentos: [],
      },
      {
        id: "cerrada",
        titulo: "Lección de sección cerrada",
        descripcion: null,
        tipo: "TEXTO",
        contenido: "Todavía no",
        orden: 2,
        // Visible, pero su sección no lo está: este es el caso que una
        // comprobación ingenua de `visible` dejaría pasar.
        visible: true,
        seccionId: "s2",
        documentos: [],
      },
    ],
  };
}

describe("LeccionEstudiantePage — seguridad (bloque D.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({
      id: "est-1",
      rol: "ESTUDIANTE",
      nombre: "Ana",
      apellido: "Pérez",
    });
    (prisma.courses.findUnique as any).mockResolvedValue(cursoConSeccionCerrada());
    (prisma.courseUsers.findFirst as any).mockResolvedValue({ id: "insc-1" });
    (prisma.contentViews.findMany as any).mockResolvedValue([]);
    falso.cookies = {};
  });

  it("da 404 en una lección de una sección NO_DISPONIBLE, aunque esté marcada como visible", async () => {
    await expect(LeccionEstudiantePage({ params: params("cerrada") })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });

  it("da 404 en una lección oculta", async () => {
    await expect(LeccionEstudiantePage({ params: params("oculta") })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });

  it("da 404 si el id no existe en ese curso", async () => {
    await expect(LeccionEstudiantePage({ params: params("inventada") })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });

  it("da 404 si el estudiante no está inscrito en el curso", async () => {
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);

    await expect(LeccionEstudiantePage({ params: params("abierta") })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });

  it("deja entrar a una lección accesible", async () => {
    await expect(LeccionEstudiantePage({ params: params("abierta") })).resolves.toBeDefined();
  });

  it("manda al login a un Administrador", async () => {
    // US42 (25/11/2026) cambió esta guarda: ahora entran Estudiante y
    // Tutor, y el Tutor solo si es el dueño del curso. Los demás roles
    // siguen fuera.
    (prisma.users.findUnique as any).mockResolvedValue({ id: "a-1", rol: "ADMINISTRADOR" });

    await expect(LeccionEstudiantePage({ params: params("abierta") })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
  });

  it("US42: un Tutor que NO es dueño del curso recibe 404", async () => {
    (prisma.users.findUnique as any).mockResolvedValue({ id: "otro-tutor", rol: "TUTOR" });
    (prisma.courses.findUnique as any).mockResolvedValue(cursoConSeccionCerrada());
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);

    await expect(LeccionEstudiantePage({ params: params("abierta") })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });

  it("US42: el Tutor dueño abre la lección en vista previa, sin inscripción", async () => {
    (prisma.users.findUnique as any).mockResolvedValue({ id: "tutor-1", rol: "TUTOR" });
    (prisma.courses.findUnique as any).mockResolvedValue(cursoConSeccionCerrada());
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);
    (prisma.contentViews.findMany as any).mockResolvedValue([]);

    await expect(LeccionEstudiantePage({ params: params("abierta") })).resolves.toBeTruthy();
  });

  it("US42: la vista previa NO salta las guardas de contenido", async () => {
    // Lo que importa de esta historia: el Tutor ve lo que ve un estudiante,
    // no más. Una lección de una sección cerrada sigue dando 404 también
    // para él — si no, la vista previa mentiría justo en lo que vino a
    // comprobar.
    (prisma.users.findUnique as any).mockResolvedValue({ id: "tutor-1", rol: "TUTOR" });
    (prisma.courses.findUnique as any).mockResolvedValue(cursoConSeccionCerrada());
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);
    (prisma.contentViews.findMany as any).mockResolvedValue([]);

    await expect(LeccionEstudiantePage({ params: params("cerrada") })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    await expect(LeccionEstudiantePage({ params: params("oculta") })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });
});

/**
 * US56-A (28/11/2026) — el modo de lectura que eligió el estudiante.
 *
 * El docente eligió el 28/11 que la lección pueda leerse sobre fondo claro
 * y que lo decida el estudiante. Lo que se afirma acá es lo único que puede
 * salir mal sin que nadie lo note: que el modo **se lea en el servidor** y
 * llegue al reproductor. Si algún día alguien lo mueve a `localStorage`,
 * estas pruebas caen — y deben caer.
 */
describe("LeccionEstudiantePage — modo de lectura (US56-A)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({
      id: "est-1",
      rol: "ESTUDIANTE",
      nombre: "Ana",
      apellido: "Pérez",
    });
    (prisma.courses.findUnique as any).mockResolvedValue(cursoConSeccionCerrada());
    (prisma.courseUsers.findFirst as any).mockResolvedValue({ id: "insc-1" });
    (prisma.contentViews.findMany as any).mockResolvedValue([]);
    falso.cookies = {};
  });

  it("sin cookie, la lección sale en el modo de la plataforma", async () => {
    const arbol = await LeccionEstudiantePage({ params: params("abierta") });

    expect(propsConLaClave(arbol, "modoLectura")?.modoLectura).toBe("oscuro");
  });

  it("con la cookie en claro, la lección sale en modo lectura", async () => {
    falso.cookies["modo-lectura"] = "claro";

    const arbol = await LeccionEstudiantePage({ params: params("abierta") });

    expect(propsConLaClave(arbol, "modoLectura")?.modoLectura).toBe("claro");
  });

  it("una cookie ilegible no rompe la lección: vuelve al modo oscuro", async () => {
    // La cookie la escribe el navegador y puede decir cualquier cosa.
    falso.cookies["modo-lectura"] = "sepia";

    const arbol = await LeccionEstudiantePage({ params: params("abierta") });

    expect(propsConLaClave(arbol, "modoLectura")?.modoLectura).toBe("oscuro");
  });

  it("el cuerpo de la lección se pinta con la tipografía de lectura", async () => {
    // La otra mitad de la capa A: la variante tipográfica es la del
    // reproductor, no la compacta de los anuncios y el glosario.
    const arbol = await LeccionEstudiantePage({ params: params("abierta") });

    expect(propsConLaClave(arbol, "variante")?.variante).toBe("lectura");
  });
});
