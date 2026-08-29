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
    courseUsers: {
      findMany: vi.fn(),
    },
    contentViews: {
      findMany: vi.fn(),
    },
  },
}));

import EstudiantePage from "./page";
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

describe("EstudiantePage (US14 minimo / US15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige a /login si no hay sesion activa", async () => {
    mockSesion(null);

    await expect(EstudiantePage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.courseUsers.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si el usuario autenticado no es Estudiante", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR" });

    await expect(EstudiantePage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.courseUsers.findMany).not.toHaveBeenCalled();
  });

  it("consulta las inscripciones y los contenidos visibles de cada curso", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courseUsers.findMany as any).mockResolvedValue([
      {
        id: "insc-1",
        course: {
          id: "curso-1",
          titulo: "Curso 1",
          estado: "PUBLICADO",
          contenidos: [{ id: "c1" }, { id: "c2" }],
        },
      },
    ]);
    (prisma.contentViews.findMany as any).mockResolvedValue([{ contentId: "c1" }]);

    await EstudiantePage();

    expect(prisma.courseUsers.findMany).toHaveBeenCalledWith({
      where: { userId: "est-1" },
      include: {
        course: { include: { contenidos: { where: { visible: true }, select: { id: true } } } },
      },
      orderBy: { fecha: "desc" },
    });
    expect(prisma.contentViews.findMany).toHaveBeenCalledWith({
      where: { userId: "est-1", contentId: { in: ["c1", "c2"] } },
      select: { contentId: true },
    });
  });

  it("no consulta contenidos vistos si no hay contenidos visibles inscritos (US19)", async () => {
    mockSesion("auth-3");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courseUsers.findMany as any).mockResolvedValue([]);

    await EstudiantePage();

    expect(prisma.contentViews.findMany).not.toHaveBeenCalled();
  });
});
