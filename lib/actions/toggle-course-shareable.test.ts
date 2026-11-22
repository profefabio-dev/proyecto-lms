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

describe("alternarCursoCompartible (US47)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "tutor-1", rol: "TUTOR" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
      compartible: false,
    });
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
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      tutorId: "otro-tutor",
      compartible: false,
    });

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
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
      compartible: true,
    });
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
});
