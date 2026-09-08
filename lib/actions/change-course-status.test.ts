import { describe, it, expect, vi, beforeEach } from "vitest";
import { cambiarEstadoCurso } from "./change-course-status";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findUnique: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function buildFormData(courseId: string, estado: string) {
  const fd = new FormData();
  fd.append("courseId", courseId);
  fd.append("estado", estado);
  return fd;
}

function mockSesionTutor() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
  } as any);
  vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "tutor-1", rol: "TUTOR" } as any);
}

describe("cambiarEstadoCurso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesión", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const resultado = await cambiarEstadoCurso(null, buildFormData("curso-1", "PUBLICADO"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el usuario no es tutor", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "ESTUDIANTE" } as any);

    const resultado = await cambiarEstadoCurso(null, buildFormData("curso-1", "PUBLICADO"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza un valor de estado no reconocido", async () => {
    mockSesionTutor();

    const resultado = await cambiarEstadoCurso(null, buildFormData("curso-1", "ELIMINADO"));

    expect(resultado.success).toBe(false);
    expect(prisma.courses.findUnique).not.toHaveBeenCalled();
  });

  it("rechaza si el curso no existe", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue(null);

    const resultado = await cambiarEstadoCurso(null, buildFormData("curso-1", "PUBLICADO"));

    expect(resultado.success).toBe(false);
    expect(prisma.courses.update).not.toHaveBeenCalled();
  });

  it("rechaza si el curso no pertenece al tutor", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "otro-tutor",
    } as any);

    const resultado = await cambiarEstadoCurso(null, buildFormData("curso-1", "PUBLICADO"));

    expect(resultado.success).toBe(false);
    expect(prisma.courses.update).not.toHaveBeenCalled();
  });

  it("cambia el curso de Borrador a Publicado sin tocar el resto de los datos", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
      estado: "BORRADOR",
    } as any);
    vi.mocked(prisma.courses.update).mockResolvedValue({} as any);

    const resultado = await cambiarEstadoCurso(null, buildFormData("curso-1", "PUBLICADO"));

    expect(resultado.success).toBe(true);
    expect(prisma.courses.update).toHaveBeenCalledWith({
      where: { id: "curso-1" },
      data: { estado: "PUBLICADO" },
    });
  });

  it("propaga el error si la base de datos falla", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
      estado: "BORRADOR",
    } as any);
    vi.mocked(prisma.courses.update).mockRejectedValue(new Error("fallo db"));

    const resultado = await cambiarEstadoCurso(null, buildFormData("curso-1", "PUBLICADO"));

    expect(resultado.success).toBe(false);
  });
});
