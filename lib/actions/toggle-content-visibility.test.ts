import { describe, it, expect, vi, beforeEach } from "vitest";
import { alternarVisibilidadContenido } from "./toggle-content-visibility";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findUnique: vi.fn() },
    contents: { findUnique: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function buildFormData(contentId: string) {
  const fd = new FormData();
  fd.append("contentId", contentId);
  return fd;
}

function mockSesionTutor() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
  } as any);
  vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "tutor-1", rol: "TUTOR" } as any);
}

describe("alternarVisibilidadContenido (US12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesión", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const resultado = await alternarVisibilidadContenido(null, buildFormData("cont-1"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el usuario no es tutor", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "ESTUDIANTE" } as any);

    const resultado = await alternarVisibilidadContenido(null, buildFormData("cont-1"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el contenido no existe", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue(null);

    const resultado = await alternarVisibilidadContenido(null, buildFormData("cont-1"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el curso del contenido no pertenece al tutor", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "cont-1",
      courseId: "curso-1",
      visible: true,
    } as any);
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "otro-tutor",
    } as any);

    const resultado = await alternarVisibilidadContenido(null, buildFormData("cont-1"));

    expect(resultado.success).toBe(false);
  });

  it("cambia visible de true a false", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "cont-1",
      courseId: "curso-1",
      visible: true,
    } as any);
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.contents.update).mockResolvedValue({} as any);

    const resultado = await alternarVisibilidadContenido(null, buildFormData("cont-1"));

    expect(resultado.success).toBe(true);
    expect(prisma.contents.update).toHaveBeenCalledWith({
      where: { id: "cont-1" },
      data: { visible: false },
    });
  });

  it("cambia visible de false a true", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "cont-1",
      courseId: "curso-1",
      visible: false,
    } as any);
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.contents.update).mockResolvedValue({} as any);

    const resultado = await alternarVisibilidadContenido(null, buildFormData("cont-1"));

    expect(resultado.success).toBe(true);
    expect(prisma.contents.update).toHaveBeenCalledWith({
      where: { id: "cont-1" },
      data: { visible: true },
    });
  });

  it("propaga el error si la base de datos falla", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "cont-1",
      courseId: "curso-1",
      visible: true,
    } as any);
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.contents.update).mockRejectedValue(new Error("fallo db"));

    const resultado = await alternarVisibilidadContenido(null, buildFormData("cont-1"));

    expect(resultado.success).toBe(false);
  });
});
