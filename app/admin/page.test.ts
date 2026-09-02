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
      count: vi.fn(),
    },
    courseUsers: {
      findMany: vi.fn(),
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
    expect(prisma.users.count).not.toHaveBeenCalled();
    expect(prisma.courses.count).not.toHaveBeenCalled();
  });

  it("redirige a /login si el usuario autenticado no es Administrador", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR" });

    await expect(AdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.users.count).not.toHaveBeenCalled();
    expect(prisma.courses.count).not.toHaveBeenCalled();
  });

  it("redirige a /login si el Administrador no tiene espacioId (US24, caso defensivo)", async () => {
    mockSesion("auth-1b");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR", espacioId: null });

    await expect(AdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.users.count).not.toHaveBeenCalled();
  });

  it("consulta los indicadores scoped al espacio del Administrador autenticado (US24)", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({
      id: "admin-1",
      rol: "ADMINISTRADOR",
      espacioId: "espacio-1",
    });
    (prisma.users.count as any).mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    (prisma.courseUsers.findMany as any).mockResolvedValue([{ userId: "e1" }, { userId: "e2" }]);
    (prisma.courses.count as any).mockResolvedValue(3);
    (prisma.contents.count as any).mockResolvedValue(10);

    await AdminPage();

    expect(prisma.users.count).toHaveBeenNthCalledWith(1, {
      where: { rol: "ADMINISTRADOR", espacioId: "espacio-1" },
    });
    expect(prisma.users.count).toHaveBeenNthCalledWith(2, {
      where: { rol: "TUTOR", espacioId: "espacio-1" },
    });
    expect(prisma.courseUsers.findMany).toHaveBeenCalledWith({
      where: { course: { tutor: { espacioId: "espacio-1" } } },
      distinct: ["userId"],
      select: { userId: true },
    });
    expect(prisma.courses.count).toHaveBeenCalledWith({
      where: { estado: "PUBLICADO", tutor: { espacioId: "espacio-1" } },
    });
    expect(prisma.contents.count).toHaveBeenCalledWith({
      where: { course: { tutor: { espacioId: "espacio-1" } } },
    });
  });
});
