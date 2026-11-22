/**
 * Bloque D de `Checklist_Validacion_Manual.md`, automatizado (23/11/2026).
 *
 * Estas eran pruebas manuales: abrir la evaluación, mirar el código fuente
 * de la página y comprobar que la palabra `esCorrecta` no aparece. Llevaban
 * días sin hacerse, y una prueba manual solo protege el día que alguien se
 * acuerda de repetirla — si la consulta cambia dentro de tres semanas por
 * un ajuste en otra parte, nadie se entera. Aquí quedan fijadas para que
 * corran en cada push.
 *
 * Lo que se afirma es **la forma exacta del `select` de las opciones**, no
 * el HTML renderizado: `esCorrecta` no debe salir de la base de datos en
 * esta consulta. Si saliera, quedaría escrita en el HTML de la página y
 * bastaría con Ctrl+U para ver la hoja de respuestas.
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

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    quizzes: { findUnique: vi.fn() },
    courseUsers: { findFirst: vi.fn() },
    intentosQuiz: { findMany: vi.fn() },
  },
}));

import ResponderQuizPage from "./page";
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

const PARAMS = Promise.resolve({ courseId: "curso-1", quizId: "quiz-1" });

function quizVisible() {
  return {
    id: "quiz-1",
    courseId: "curso-1",
    titulo: "Repaso",
    descripcion: null,
    visible: true,
    intentosMaximos: null,
    course: { id: "curso-1", titulo: "Curso 1" },
    preguntas: [
      {
        id: "p1",
        enunciado: "¿Cuál es?",
        opciones: [
          { id: "o1", texto: "Una" },
          { id: "o2", texto: "Otra" },
        ],
      },
    ],
  };
}

describe("ResponderQuizPage — seguridad (bloque D.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.quizzes.findUnique as any).mockResolvedValue(quizVisible());
    (prisma.courseUsers.findFirst as any).mockResolvedValue({ id: "insc-1" });
    (prisma.intentosQuiz.findMany as any).mockResolvedValue([]);
  });

  it("NUNCA pide esCorrecta: las opciones se traen solo con id y texto", async () => {
    await ResponderQuizPage({ params: PARAMS });

    const consulta = (prisma.quizzes.findUnique as any).mock.calls[0][0];
    const selectDeOpciones = consulta.include.preguntas.select.opciones.select;

    expect(selectDeOpciones).toEqual({ id: true, texto: true });
    expect(selectDeOpciones).not.toHaveProperty("esCorrecta");

    // Red de seguridad más amplia: que la palabra no aparezca en ninguna
    // parte de la consulta, aunque alguien la agregue en otro nivel.
    expect(JSON.stringify(consulta)).not.toContain("esCorrecta");
  });

  it("da 404 si la evaluación está oculta", async () => {
    (prisma.quizzes.findUnique as any).mockResolvedValue({
      ...quizVisible(),
      visible: false,
    });

    await expect(ResponderQuizPage({ params: PARAMS })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("da 404 si la evaluación es de otro curso, aunque se conozca su id", async () => {
    (prisma.quizzes.findUnique as any).mockResolvedValue({
      ...quizVisible(),
      courseId: "otro-curso",
    });

    await expect(ResponderQuizPage({ params: PARAMS })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("da 404 si el estudiante no está inscrito en el curso", async () => {
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);

    await expect(ResponderQuizPage({ params: PARAMS })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("manda al login a quien no es Estudiante", async () => {
    (prisma.users.findUnique as any).mockResolvedValue({ id: "t-1", rol: "TUTOR" });

    await expect(ResponderQuizPage({ params: PARAMS })).rejects.toThrow("NEXT_REDIRECT");
    expect(prisma.quizzes.findUnique).not.toHaveBeenCalled();
  });
});
