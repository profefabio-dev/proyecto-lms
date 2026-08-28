import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
    },
    courses: {
      findUnique: vi.fn(),
    },
    contents: {
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { crearContenidoTexto } from "./create-text-content";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function buildFormData(data: Record<string, string>) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.set(k, v));
  return fd;
}

function mockSesion(authUserId: string | null) {
  (createClient as any).mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: authUserId ? { id: authUserId } : null } }),
    },
  });
}

const datosValidos = {
  courseId: "curso-1",
  titulo: "Conceptos básicos",
  contenido: "# Introducción\n\nAlgunos **conceptos** clave:\n\n- Uno\n- Dos",
};

describe("crearContenidoTexto (US10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesion activa", async () => {
    mockSesion(null);

    const resultado = await crearContenidoTexto(null, buildFormData(datosValidos));

    expect(resultado.success).toBe(false);
    expect(prisma.contents.create).not.toHaveBeenCalled();
  });

  it("rechaza si quien llama no es Tutor", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });

    const resultado = await crearContenidoTexto(null, buildFormData(datosValidos));

    expect(resultado.success).toBe(false);
    expect(prisma.contents.create).not.toHaveBeenCalled();
  });

  it("rechaza si el titulo esta vacio", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR" });

    const resultado = await crearContenidoTexto(
      null,
      buildFormData({ ...datosValidos, titulo: "" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.contents.create).not.toHaveBeenCalled();
  });

  it("rechaza si el contenido esta vacio", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR" });

    const resultado = await crearContenidoTexto(
      null,
      buildFormData({ ...datosValidos, contenido: "" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.contents.create).not.toHaveBeenCalled();
  });

  it("rechaza si el curso no existe o no pertenece al tutor", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR", id: "tutor-1" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      tutorId: "otro-tutor",
    });

    const resultado = await crearContenidoTexto(null, buildFormData(datosValidos));

    expect(resultado.success).toBe(false);
    expect(prisma.contents.create).not.toHaveBeenCalled();
  });

  it("crea el contenido de texto cuando todo es valido", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR", id: "tutor-1" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    });
    (prisma.contents.count as any).mockResolvedValue(3);
    (prisma.contents.create as any).mockResolvedValue({ id: "contenido-1" });

    const resultado = await crearContenidoTexto(null, buildFormData(datosValidos));

    expect(resultado.success).toBe(true);
    expect(prisma.contents.create).toHaveBeenCalledWith({
      data: {
        courseId: "curso-1",
        titulo: "Conceptos básicos",
        descripcion: null,
        tipo: "TEXTO",
        contenido: datosValidos.contenido,
        orden: 3,
      },
    });
  });

  it("propaga el error si falla la base de datos", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR", id: "tutor-1" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    });
    (prisma.contents.count as any).mockResolvedValue(0);
    (prisma.contents.create as any).mockRejectedValue(new Error("fallo db"));

    const resultado = await crearContenidoTexto(null, buildFormData(datosValidos));

    expect(resultado.success).toBe(false);
  });
});
