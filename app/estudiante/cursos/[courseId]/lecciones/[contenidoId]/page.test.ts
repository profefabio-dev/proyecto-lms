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
 * Un curso con dos secciones: la primera disponible con una lección
 * visible y otra oculta, y la segunda NO_DISPONIBLE con una lección que sí
 * está marcada como visible — ese es el caso interesante.
 */
function cursoConSeccionCerrada() {
  return {
    id: "curso-1",
    titulo: "Curso 1",
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

  it("manda al login a quien no es Estudiante", async () => {
    (prisma.users.findUnique as any).mockResolvedValue({ id: "t-1", rol: "TUTOR" });

    await expect(LeccionEstudiantePage({ params: params("abierta") })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
  });
});
