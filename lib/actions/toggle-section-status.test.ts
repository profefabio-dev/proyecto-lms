import { describe, it, expect, vi, beforeEach } from "vitest";
import { alternarEstadoSeccion } from "./toggle-section-status";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findUnique: vi.fn() },
    secciones: { findUnique: vi.fn(), update: vi.fn() },
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

describe("alternarEstadoSeccion (US30)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesión", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const resultado = await alternarEstadoSeccion(null, buildFormData("seccion-1"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el usuario no es tutor", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "ESTUDIANTE" } as any);

    const resultado = await alternarEstadoSeccion(null, buildFormData("seccion-1"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si la sección no existe", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue(null);

    const resultado = await alternarEstadoSeccion(null, buildFormData("seccion-1"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el curso de la sección no pertenece al tutor", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue({
      id: "seccion-1",
      courseId: "curso-1",
      estado: "DISPONIBLE",
    } as any);
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "otro-tutor",
    } as any);

    const resultado = await alternarEstadoSeccion(null, buildFormData("seccion-1"));

    expect(resultado.success).toBe(false);
  });

  it("pasa de DISPONIBLE a NO_DISPONIBLE", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue({
      id: "seccion-1",
      courseId: "curso-1",
      estado: "DISPONIBLE",
    } as any);
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);

    const resultado = await alternarEstadoSeccion(null, buildFormData("seccion-1"));

    expect(resultado.success).toBe(true);
    expect(prisma.secciones.update).toHaveBeenCalledWith({
      where: { id: "seccion-1" },
      data: { estado: "NO_DISPONIBLE" },
    });
  });

  it("pasa de NO_DISPONIBLE a DISPONIBLE", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue({
      id: "seccion-1",
      courseId: "curso-1",
      estado: "NO_DISPONIBLE",
    } as any);
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);

    const resultado = await alternarEstadoSeccion(null, buildFormData("seccion-1"));

    expect(resultado.success).toBe(true);
    expect(prisma.secciones.update).toHaveBeenCalledWith({
      where: { id: "seccion-1" },
      data: { estado: "DISPONIBLE" },
    });
  });

  it("propaga el error si la base de datos falla", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue({
      id: "seccion-1",
      courseId: "curso-1",
      estado: "DISPONIBLE",
    } as any);
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.secciones.update).mockRejectedValue(new Error("fallo db"));

    const resultado = await alternarEstadoSeccion(null, buildFormData("seccion-1"));

    expect(resultado.success).toBe(false);
  });
});
