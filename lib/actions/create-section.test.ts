import { describe, it, expect, vi, beforeEach } from "vitest";
import { crearSeccion } from "./create-section";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findUnique: vi.fn() },
    secciones: { count: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function buildFormData(courseId: string, titulo: string) {
  const fd = new FormData();
  fd.append("courseId", courseId);
  fd.append("titulo", titulo);
  return fd;
}

function mockSesionTutor() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
  } as any);
  vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "tutor-1", rol: "TUTOR" } as any);
}

describe("crearSeccion (US30)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesión", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const resultado = await crearSeccion(null, buildFormData("curso-1", "Semana 1"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el usuario no es tutor", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "ESTUDIANTE" } as any);

    const resultado = await crearSeccion(null, buildFormData("curso-1", "Semana 1"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza un título demasiado corto", async () => {
    mockSesionTutor();

    const resultado = await crearSeccion(null, buildFormData("curso-1", "Hi"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el curso no pertenece al tutor", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "otro-tutor",
    } as any);

    const resultado = await crearSeccion(null, buildFormData("curso-1", "Semana 1"));

    expect(resultado.success).toBe(false);
  });

  it("crea la sección al final del orden existente", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.secciones.count).mockResolvedValue(2);
    vi.mocked(prisma.secciones.create).mockResolvedValue({ id: "seccion-3" } as any);

    const resultado = await crearSeccion(null, buildFormData("curso-1", "Semana 3"));

    expect(resultado).toEqual({ success: true, seccionId: "seccion-3" });
    expect(prisma.secciones.create).toHaveBeenCalledWith({
      data: { courseId: "curso-1", titulo: "Semana 3", orden: 2 },
    });
  });

  it("propaga el error si la base de datos falla", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.secciones.count).mockRejectedValue(new Error("fallo db"));

    const resultado = await crearSeccion(null, buildFormData("curso-1", "Semana 3"));

    expect(resultado.success).toBe(false);
  });
});
