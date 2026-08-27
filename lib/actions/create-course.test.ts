import { describe, it, expect, vi, beforeEach } from "vitest";
import { crearCurso } from "./create-course";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/prisma", () => ({
  prisma: { users: { findUnique: vi.fn() }, courses: { create: vi.fn() } },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function buildFormData(data: Record<string, string>) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

const datosValidos = {
  titulo: "Introducción a la Programación",
  descripcion: "Curso básico de programación para principiantes",
  imagen: "https://example.com/imagen.png",
  estado: "BORRADOR",
};

describe("crearCurso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesión", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const resultado = await crearCurso(null, buildFormData(datosValidos));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el usuario no es tutor", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "ESTUDIANTE" } as any);

    const resultado = await crearCurso(null, buildFormData(datosValidos));

    expect(resultado.success).toBe(false);
  });

  it("rechaza datos inválidos (imagen no es una URL)", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "TUTOR" } as any);

    const resultado = await crearCurso(
      null,
      buildFormData({ ...datosValidos, imagen: "no-es-una-url" })
    );

    expect(resultado.success).toBe(false);
  });

  it("crea el curso cuando el tutor está autenticado y los datos son válidos", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "TUTOR" } as any);
    vi.mocked(prisma.courses.create).mockResolvedValue({ id: "curso-1" } as any);

    const resultado = await crearCurso(
      null,
      buildFormData({ ...datosValidos, estado: "PUBLICADO" })
    );

    expect(resultado.success).toBe(true);
    expect(prisma.courses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          titulo: datosValidos.titulo,
          tutorId: "u1",
          estado: "PUBLICADO",
        }),
      })
    );
  });

  it("propaga el error si la base de datos falla", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "TUTOR" } as any);
    vi.mocked(prisma.courses.create).mockRejectedValue(new Error("fallo db"));

    const resultado = await crearCurso(null, buildFormData(datosValidos));

    expect(resultado.success).toBe(false);
  });
});