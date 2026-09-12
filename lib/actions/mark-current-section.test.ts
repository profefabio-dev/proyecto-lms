import { describe, it, expect, vi, beforeEach } from "vitest";
import { marcarSeccionActual } from "./mark-current-section";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findUnique: vi.fn() },
    secciones: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function buildFormData(seccionId: string) {
  const fd = new FormData();
  fd.append("seccionId", seccionId);
  return fd;
}

function mockSesionTutor() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
  } as any);
  vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "tutor-1", rol: "TUTOR" } as any);
}

describe("marcarSeccionActual (US30)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesión", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const resultado = await marcarSeccionActual(null, buildFormData("seccion-1"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el usuario no es tutor", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "ESTUDIANTE" } as any);

    const resultado = await marcarSeccionActual(null, buildFormData("seccion-1"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si la sección no existe", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue(null);

    const resultado = await marcarSeccionActual(null, buildFormData("seccion-1"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el curso de la sección no pertenece al tutor", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue({
      id: "seccion-1",
      courseId: "curso-1",
      esActual: false,
    } as any);
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "otro-tutor",
    } as any);

    const resultado = await marcarSeccionActual(null, buildFormData("seccion-1"));

    expect(resultado.success).toBe(false);
  });

  it("desmarca las demás secciones del curso y marca la elegida", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue({
      id: "seccion-1",
      courseId: "curso-1",
      esActual: false,
    } as any);
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as any);

    const resultado = await marcarSeccionActual(null, buildFormData("seccion-1"));

    expect(resultado.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.secciones.update).not.toHaveBeenCalled();
  });

  it("desmarca la sección si ya era la semana actual (segundo clic)", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue({
      id: "seccion-1",
      courseId: "curso-1",
      esActual: true,
    } as any);
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);

    const resultado = await marcarSeccionActual(null, buildFormData("seccion-1"));

    expect(resultado.success).toBe(true);
    expect(prisma.secciones.update).toHaveBeenCalledWith({
      where: { id: "seccion-1" },
      data: { esActual: false },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("propaga el error si la base de datos falla", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue({
      id: "seccion-1",
      courseId: "curso-1",
      esActual: false,
    } as any);
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("fallo db"));

    const resultado = await marcarSeccionActual(null, buildFormData("seccion-1"));

    expect(resultado.success).toBe(false);
  });
});
