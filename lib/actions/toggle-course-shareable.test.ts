/**
 * US47 — compartir un curso es decisión de quien lo creó (23/11/2026).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { alternarCursoCompartible } from "./toggle-course-shareable";
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

function formData(courseId = "curso-1") {
  const fd = new FormData();
  fd.set("courseId", courseId);
  return fd;
}

/** Un curso que cumple los requisitos mínimos de US49. */
function cursoCompleto(extra: Record<string, unknown> = {}) {
  return {
    id: "curso-1",
    tutorId: "tutor-1",
    compartible: false,
    descripcion:
      "Un curso completo sobre los fundamentos de la informática, pensado para estudiantes de bachillerato.",
    imagen: "https://ejemplo/portada.jpg",
    _count: { contenidos: 6, actividades: 1, quizzes: 1 },
    ...extra,
  };
}

describe("alternarCursoCompartible (US47)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "tutor-1", rol: "TUTOR" });
    (prisma.courses.findUnique as any).mockResolvedValue(cursoCompleto());
  });

  it("rechaza si no hay sesión", async () => {
    mockSesion(null);

    const resultado = await alternarCursoCompartible(null, formData());

    expect(resultado.success).toBe(false);
    expect(prisma.courses.update).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario no es Tutor", async () => {
    (prisma.users.findUnique as any).mockResolvedValue({ id: "a-1", rol: "ADMINISTRADOR" });

    const resultado = await alternarCursoCompartible(null, formData());

    expect(resultado).toEqual({
      success: false,
      error: "Solo un tutor puede compartir un curso.",
    });
    expect(prisma.courses.update).not.toHaveBeenCalled();
  });

  it("RECHAZA compartir el curso de otro tutor", async () => {
    (prisma.courses.findUnique as any).mockResolvedValue(
      cursoCompleto({ tutorId: "otro-tutor" })
    );

    const resultado = await alternarCursoCompartible(null, formData());

    expect(resultado).toEqual({
      success: false,
      error: "No encontramos ese curso entre los tuyos.",
    });
    expect(prisma.courses.update).not.toHaveBeenCalled();
  });

  it("comparte un curso que no lo estaba", async () => {
    (prisma.courses.update as any).mockResolvedValue({ compartible: true });

    const resultado = await alternarCursoCompartible(null, formData());

    expect(resultado).toEqual({ success: true, compartible: true });
    expect(prisma.courses.update).toHaveBeenCalledWith({
      where: { id: "curso-1" },
      data: { compartible: true },
    });
  });

  it("deja de compartir uno que sí lo estaba", async () => {
    (prisma.courses.findUnique as any).mockResolvedValue(cursoCompleto({ compartible: true }));
    (prisma.courses.update as any).mockResolvedValue({ compartible: false });

    const resultado = await alternarCursoCompartible(null, formData());

    expect(resultado).toEqual({ success: true, compartible: false });
    expect(prisma.courses.update).toHaveBeenCalledWith({
      where: { id: "curso-1" },
      data: { compartible: false },
    });
  });

  it("devuelve un error controlado si la base de datos falla", async () => {
    (prisma.courses.update as any).mockRejectedValue(new Error("db caída"));

    const resultado = await alternarCursoCompartible(null, formData());

    expect(resultado).toEqual({
      success: false,
      error: "No se pudo guardar el cambio. Intenta de nuevo.",
    });
  });

  // ---- US49: el piso de calidad ----

  it("NO deja compartir un curso al que le falta material, y dice qué falta", async () => {
    (prisma.courses.findUnique as any).mockResolvedValue(
      cursoCompleto({ _count: { contenidos: 1, actividades: 0, quizzes: 0 } })
    );

    const resultado = await alternarCursoCompartible(null, formData());

    expect(resultado.success).toBe(false);
    expect(!resultado.success && resultado.error).toContain("2 lecciones más publicadas");
    expect(!resultado.success && resultado.error).toContain("actividad o una evaluación");
    expect(prisma.courses.update).not.toHaveBeenCalled();
  });

  it("NO deja compartir un curso sin portada", async () => {
    (prisma.courses.findUnique as any).mockResolvedValue(cursoCompleto({ imagen: null }));

    const resultado = await alternarCursoCompartible(null, formData());

    expect(resultado.success).toBe(false);
    expect(!resultado.success && resultado.error).toContain("imagen de portada");
  });

  it("los requisitos NO bloquean dejar de compartir", async () => {
    // Un curso que ya circulaba no debe quedar atrapado porque su autor le
    // ocultó una lección después de compartirlo.
    (prisma.courses.findUnique as any).mockResolvedValue(
      cursoCompleto({ compartible: true, imagen: null, _count: { contenidos: 0, actividades: 0, quizzes: 0 } })
    );
    (prisma.courses.update as any).mockResolvedValue({ compartible: false });

    const resultado = await alternarCursoCompartible(null, formData());

    expect(resultado).toEqual({ success: true, compartible: false });
  });
});
