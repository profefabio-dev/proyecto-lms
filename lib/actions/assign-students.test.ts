import { describe, it, expect, vi, beforeEach } from "vitest";
import { asignarEstudiantes } from "./assign-students";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn(), findMany: vi.fn() },
    courses: { findUnique: vi.fn() },
    courseUsers: { findMany: vi.fn(), createMany: vi.fn() },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function buildFormData(courseId: string, estudianteIds: string[]) {
  const fd = new FormData();
  fd.append("courseId", courseId);
  estudianteIds.forEach((id) => fd.append("estudianteIds", id));
  return fd;
}

function mockSesionTutor() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
  } as any);
  vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "tutor-1", rol: "TUTOR" } as any);
}

describe("asignarEstudiantes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesión", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const resultado = await asignarEstudiantes(null, buildFormData("curso-1", ["est-1"]));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el usuario no es tutor", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "ESTUDIANTE" } as any);

    const resultado = await asignarEstudiantes(null, buildFormData("curso-1", ["est-1"]));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si no se selecciona ningún estudiante", async () => {
    mockSesionTutor();

    const resultado = await asignarEstudiantes(null, buildFormData("curso-1", []));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el curso no pertenece al tutor", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "otro-tutor",
    } as any);

    const resultado = await asignarEstudiantes(null, buildFormData("curso-1", ["est-1"]));

    expect(resultado.success).toBe(false);
  });

  it("asigna solo los estudiantes válidos y no inscritos previamente", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.users.findMany).mockResolvedValue([{ id: "est-1" }, { id: "est-2" }] as any);
    vi.mocked(prisma.courseUsers.findMany).mockResolvedValue([{ userId: "est-2" }] as any);
    vi.mocked(prisma.courseUsers.createMany).mockResolvedValue({ count: 1 } as any);

    const resultado = await asignarEstudiantes(
      null,
      buildFormData("curso-1", ["est-1", "est-2"])
    );

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.asignados).toBe(1);
    }
    expect(prisma.courseUsers.createMany).toHaveBeenCalledWith({
      data: [{ courseId: "curso-1", userId: "est-1" }],
    });
  });

  it("propaga el error si la base de datos falla", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.users.findMany).mockResolvedValue([{ id: "est-1" }] as any);
    vi.mocked(prisma.courseUsers.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.courseUsers.createMany).mockRejectedValue(new Error("fallo db"));

    const resultado = await asignarEstudiantes(null, buildFormData("curso-1", ["est-1"]));

    expect(resultado.success).toBe(false);
  });
});