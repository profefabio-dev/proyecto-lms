/**
 * US47 — las guardas de adoptar un curso (23/11/2026).
 *
 * Lo que se copia y lo que no está probado en `lib/course-copy.test.ts`,
 * que es lógica pura. Aquí se fija **quién puede adoptar y qué**, que es
 * donde está el riesgo: esta es la única operación del proyecto que lee un
 * curso de otro espacio, así que la comprobación de `compartible` es lo
 * que impide que conocer un id alcance para sacar un curso privado.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/storage", () => ({
  copiarDocumentoEnStorage: vi.fn(),
  eliminarDocumentoDeStorage: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findUnique: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { adoptarCurso } from "./adopt-course";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { copiarDocumentoEnStorage } from "@/lib/supabase/storage";

function mockSesion(authUserId: string | null) {
  (createClient as any).mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: authUserId ? { id: authUserId } : null } }),
    },
  });
}

function formData(courseId = "curso-ajeno") {
  const fd = new FormData();
  fd.set("courseId", courseId);
  return fd;
}

function cursoCompartido(extra: Record<string, unknown> = {}) {
  return {
    id: "curso-ajeno",
    titulo: "Curso de otro",
    descripcion: "Desc",
    imagen: null,
    tutorId: "tutor-autor",
    compartible: true,
    tutor: { nombre: "Ana", apellido: "Ríos" },
    secciones: [],
    contenidos: [],
    actividades: [],
    quizzes: [],
    ...extra,
  };
}

describe("adoptarCurso (US47)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "tutor-2", rol: "TUTOR" });
    (prisma.courses.findUnique as any).mockResolvedValue(cursoCompartido());
    (prisma.courses.findFirst as any).mockResolvedValue(null);
  });

  it("rechaza si no hay sesión", async () => {
    mockSesion(null);

    const resultado = await adoptarCurso(null, formData());

    expect(resultado).toEqual({
      success: false,
      error: "Debes iniciar sesión para realizar esta acción.",
    });
    expect(prisma.courses.findUnique).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario no es Tutor", async () => {
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });

    const resultado = await adoptarCurso(null, formData());

    expect(resultado).toEqual({
      success: false,
      error: "Solo un tutor puede adoptar un curso.",
    });
    expect(prisma.courses.findUnique).not.toHaveBeenCalled();
  });

  it("RECHAZA un curso que no está marcado como compartible, aunque se conozca su id", async () => {
    // La guarda que sostiene la historia: sin ella, conocer un id bastaría
    // para sacar un curso privado del espacio de otro docente.
    (prisma.courses.findUnique as any).mockResolvedValue(
      cursoCompartido({ compartible: false })
    );

    const resultado = await adoptarCurso(null, formData());

    expect(resultado).toEqual({
      success: false,
      error: "Ese curso no está disponible para adoptar.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(copiarDocumentoEnStorage).not.toHaveBeenCalled();
  });

  it("rechaza un curso que no existe", async () => {
    (prisma.courses.findUnique as any).mockResolvedValue(null);

    const resultado = await adoptarCurso(null, formData());

    expect(resultado).toEqual({
      success: false,
      error: "Ese curso no está disponible para adoptar.",
    });
  });

  it("rechaza adoptar un curso propio", async () => {
    (prisma.courses.findUnique as any).mockResolvedValue(
      cursoCompartido({ tutorId: "tutor-2" })
    );

    const resultado = await adoptarCurso(null, formData());

    expect(resultado).toEqual({ success: false, error: "Este curso ya es tuyo." });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("no deja adoptar dos veces el mismo curso", async () => {
    (prisma.courses.findFirst as any).mockResolvedValue({ id: "copia-previa" });

    const resultado = await adoptarCurso(null, formData());

    expect(resultado).toEqual({
      success: false,
      error: "Ya tienes una copia de este curso. Búscala en Mis cursos.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rechaza sin courseId", async () => {
    const resultado = await adoptarCurso(null, new FormData());

    expect(resultado.success).toBe(false);
    expect(prisma.courses.findUnique).not.toHaveBeenCalled();
  });

  it("al terminar bien, lleva a la copia recién creada", async () => {
    (prisma.$transaction as any).mockResolvedValue("curso-copia");

    // `redirect` de Next lanza a propósito, así es como corta el flujo.
    await expect(adoptarCurso(null, formData())).rejects.toThrow("NEXT_REDIRECT");
  });
});
