import { describe, it, expect, vi, beforeEach } from "vitest";
import { moverSeccion } from "./reorder-section";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findUnique: vi.fn() },
    secciones: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function buildFormData(seccionId: string, direccion: string) {
  const fd = new FormData();
  fd.append("seccionId", seccionId);
  fd.append("direccion", direccion);
  return fd;
}

function mockSesionTutor() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
  } as any);
  vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "tutor-1", rol: "TUTOR" } as any);
}

describe("moverSeccion (US30)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesión", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const resultado = await moverSeccion(null, buildFormData("seccion-1", "arriba"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el usuario no es tutor", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "ESTUDIANTE" } as any);

    const resultado = await moverSeccion(null, buildFormData("seccion-1", "arriba"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si la sección no existe", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue(null);

    const resultado = await moverSeccion(null, buildFormData("seccion-1", "arriba"));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el curso de la sección no pertenece al tutor", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue({
      id: "seccion-1",
      courseId: "curso-1",
      orden: 1,
      course: { id: "curso-1", tutorId: "otro-tutor" },
    } as any);

    const resultado = await moverSeccion(null, buildFormData("seccion-1", "arriba"));

    expect(resultado.success).toBe(false);
  });

  it("no hace nada si ya está en el extremo (sin vecino)", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue({
      id: "seccion-1",
      courseId: "curso-1",
      orden: 0,
      course: { id: "curso-1", tutorId: "tutor-1" },
    } as any);
    vi.mocked(prisma.secciones.findFirst).mockResolvedValue(null);

    const resultado = await moverSeccion(null, buildFormData("seccion-1", "arriba"));

    expect(resultado.success).toBe(true);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("intercambia el orden con el vecino al mover hacia arriba", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue({
      id: "seccion-2",
      courseId: "curso-1",
      orden: 1,
      course: { id: "curso-1", tutorId: "tutor-1" },
    } as any);
    vi.mocked(prisma.secciones.findFirst).mockResolvedValue({
      id: "seccion-1",
      courseId: "curso-1",
      orden: 0,
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as any);

    const resultado = await moverSeccion(null, buildFormData("seccion-2", "arriba"));

    expect(resultado.success).toBe(true);
    expect(prisma.secciones.findUnique).toHaveBeenCalledWith({
      where: { id: "seccion-2" },
      include: { course: true },
    });
    expect(prisma.secciones.findFirst).toHaveBeenCalledWith({
      where: { courseId: "curso-1", orden: { lt: 1 } },
      orderBy: { orden: "desc" },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("propaga el error si la base de datos falla", async () => {
    mockSesionTutor();
    vi.mocked(prisma.secciones.findUnique).mockResolvedValue({
      id: "seccion-2",
      courseId: "curso-1",
      orden: 1,
      course: { id: "curso-1", tutorId: "tutor-1" },
    } as any);
    vi.mocked(prisma.secciones.findFirst).mockResolvedValue({
      id: "seccion-1",
      courseId: "curso-1",
      orden: 0,
    } as any);
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("fallo db"));

    const resultado = await moverSeccion(null, buildFormData("seccion-2", "arriba"));

    expect(resultado.success).toBe(false);
  });
});
