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
      groupBy: vi.fn(),
    },
    courses: {
      count: vi.fn(),
    },
    contents: {
      count: vi.fn(),
    },
  },
}));

import AdminPage from "./page";
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

describe("AdminPage (US04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige a /login si no hay sesion activa", async () => {
    mockSesion(null);

    await expect(AdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.users.groupBy).not.toHaveBeenCalled();
    expect(prisma.courses.count).not.toHaveBeenCalled();
  });

  it("redirige a /login si el usuario autenticado no es Administrador", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR" });

    await expect(AdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.users.groupBy).not.toHaveBeenCalled();
    expect(prisma.courses.count).not.toHaveBeenCalled();
  });

  it("consulta el conteo de usuarios por rol, cursos activos y contenidos totales para un Administrador autenticado", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "admin-1", rol: "ADMINISTRADOR" });
    (prisma.users.groupBy as any).mockResolvedValue([
      { rol: "TUTOR", _count: { _all: 2 } },
      { rol: "ESTUDIANTE", _count: { _all: 5 } },
    ]);
    (prisma.courses.count as any).mockResolvedValue(3);
    (prisma.contents.count as any).mockResolvedValue(10);

    await AdminPage();

    expect(prisma.users.groupBy).toHaveBeenCalledWith({
      by: ["rol"],
      _count: { _all: true },
    });
    expect(prisma.courses.count).toHaveBeenCalledWith({ where: { estado: "PUBLICADO" } });
    expect(prisma.contents.count).toHaveBeenCalledWith();
  });
});
