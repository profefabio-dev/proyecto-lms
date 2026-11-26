import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
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
      findMany: vi.fn(),
    },
    courseUsers: {
      findMany: vi.fn(),
    },
    contents: {
      count: vi.fn(),
    },
    // 26/11/2026: el panel del docente estrenó la cola "Por calificar", que
    // consulta las entregas sin nota de sus cursos.
    entregas: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import TutorPage from "./page";
import { redirect } from "next/navigation";
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

describe("TutorPage (US18)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige a /login si no hay sesion activa", async () => {
    mockSesion(null);

    await expect(TutorPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.courses.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si el usuario autenticado no es Tutor", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ESTUDIANTE" });

    await expect(TutorPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.courses.findMany).not.toHaveBeenCalled();
  });

  it("consulta cursos, estudiantes inscritos (sin duplicados) y contenidos del tutor autenticado", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "tutor-1", rol: "TUTOR" });
    // 26/11/2026: el panel pasó a mostrar tarjetas de curso, así que la
    // consulta trae también el título, el estado y los tres conteos.
    (prisma.courses.findMany as any).mockResolvedValue([
      {
        id: "curso-1",
        titulo: "Curso 1",
        estado: "PUBLICADO",
        _count: { inscritos: 2, contenidos: 4, actividades: 1 },
      },
      {
        id: "curso-2",
        titulo: "Curso 2",
        estado: "BORRADOR",
        _count: { inscritos: 0, contenidos: 3, actividades: 0 },
      },
    ]);
    (prisma.courseUsers.findMany as any).mockResolvedValue([
      { userId: "est-1" },
      { userId: "est-2" },
    ]);
    (prisma.contents.count as any).mockResolvedValue(7);
    (prisma.entregas.findMany as any).mockResolvedValue([]);
    (prisma.entregas.count as any).mockResolvedValue(0);

    await TutorPage();

    expect(prisma.courses.findMany).toHaveBeenCalledWith({
      where: { tutorId: "tutor-1" },
      include: {
        _count: { select: { inscritos: true, contenidos: true, actividades: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    expect(prisma.courseUsers.findMany).toHaveBeenCalledWith({
      where: { courseId: { in: ["curso-1", "curso-2"] } },
      distinct: ["userId"],
      select: { userId: true },
    });
    expect(prisma.contents.count).toHaveBeenCalledWith({
      where: { courseId: { in: ["curso-1", "curso-2"] } },
    });
  });
});
