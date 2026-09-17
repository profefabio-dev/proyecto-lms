import { describe, it, expect, vi, beforeEach } from "vitest";
import { desinscribirEstudiantes } from "./unenroll-students";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findUnique: vi.fn() },
    courseUsers: { deleteMany: vi.fn() },
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

describe("desinscribirEstudiantes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesión", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const resultado = await desinscribirEstudiantes(null, buildFormData("curso-1", ["est-1"]));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el usuario no es tutor", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "ESTUDIANTE" } as any);

    const resultado = await desinscribirEstudiantes(null, buildFormData("curso-1", ["est-1"]));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si no se selecciona ningún estudiante", async () => {
    mockSesionTutor();

    const resultado = await desinscribirEstudiantes(null, buildFormData("curso-1", []));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el curso no pertenece al tutor", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "otro-tutor",
    } as any);

    const resultado = await desinscribirEstudiantes(null, buildFormData("curso-1", ["est-1"]));

    expect(resultado.success).toBe(false);
    // Nunca debe intentar borrar nada si la propiedad del curso no se
    // pudo confirmar primero.
    expect(prisma.courseUsers.deleteMany).not.toHaveBeenCalled();
  });

  it("quita solo las inscripciones seleccionadas de ese curso", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.courseUsers.deleteMany).mockResolvedValue({ count: 2 } as any);

    const resultado = await desinscribirEstudiantes(
      null,
      buildFormData("curso-1", ["est-1", "est-2"])
    );

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.quitados).toBe(2);
    }
    expect(prisma.courseUsers.deleteMany).toHaveBeenCalledWith({
      where: { courseId: "curso-1", userId: { in: ["est-1", "est-2"] } },
    });
  });

  it("devuelve un error controlado si la base de datos falla", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.courseUsers.deleteMany).mockRejectedValue(new Error("fallo db"));

    const resultado = await desinscribirEstudiantes(null, buildFormData("curso-1", ["est-1"]));

    expect(resultado.success).toBe(false);
  });
});
