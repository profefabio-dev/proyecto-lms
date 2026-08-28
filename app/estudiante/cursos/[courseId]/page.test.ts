import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

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
    courseUsers: {
      findFirst: vi.fn(),
    },
  },
}));

import CursoEstudiantePage from "./page";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function mockSesion(authUserId: string | null) {
  (createClient as any).mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: authUserId ? { id: authUserId } : null } }),
    },
  });
}

function buildParams(courseId: string) {
  return { params: Promise.resolve({ courseId }) };
}

describe("CursoEstudiantePage (US15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige a /login si no hay sesion activa", async () => {
    mockSesion(null);

    await expect(CursoEstudiantePage(buildParams("curso-1"))).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirige a /login si el usuario autenticado no es Estudiante", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR" });

    await expect(CursoEstudiantePage(buildParams("curso-1"))).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("devuelve 404 si el curso no existe", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courses.findUnique as any).mockResolvedValue(null);

    await expect(CursoEstudiantePage(buildParams("no-existe"))).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(notFound).toHaveBeenCalled();
  });

  it("devuelve 404 si el estudiante no esta inscrito en el curso", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      titulo: "Curso",
      descripcion: "desc",
      contenidos: [],
    });
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);

    await expect(CursoEstudiantePage(buildParams("curso-1"))).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(prisma.courseUsers.findFirst).toHaveBeenCalledWith({
      where: { courseId: "curso-1", userId: "est-1" },
    });
  });

  it("consulta los contenidos ordenados cuando el estudiante si esta inscrito", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      titulo: "Curso",
      descripcion: "desc",
      contenidos: [
        { id: "c1", titulo: "Video 1", descripcion: null, tipo: "VIDEO", contenido: "https://youtu.be/dQw4w9WgXcQ", visible: true },
        { id: "c2", titulo: "Oculto", descripcion: null, tipo: "VIDEO", contenido: "https://youtu.be/dQw4w9WgXcQ", visible: false },
      ],
    });
    (prisma.courseUsers.findFirst as any).mockResolvedValue({ id: "insc-1" });

    expect(prisma.courses.findUnique).not.toHaveBeenCalled();

    await CursoEstudiantePage(buildParams("curso-1"));

    expect(prisma.courses.findUnique).toHaveBeenCalledWith({
      where: { id: "curso-1" },
      include: { contenidos: { orderBy: { orden: "asc" } } },
    });
  });
});
