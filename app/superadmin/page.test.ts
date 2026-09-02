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
    espacios: {
      findMany: vi.fn(),
    },
  },
}));

// La página renderiza <CreateEspacioForm>, que importa la Server Action de
// US25 y, en cadena, createSyncedUser (que a su vez llega al cliente admin
// de Supabase). Se mockea para que esta siga siendo una prueba unitaria de
// la página.
vi.mock("@/lib/supabase/sync-user", () => ({
  createSyncedUser: vi.fn(),
}));

import SuperAdminPage from "./page";
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

describe("SuperAdminPage (US25)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige a /login si no hay sesion activa", async () => {
    mockSesion(null);

    await expect(SuperAdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.espacios.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si el usuario autenticado no es Super Administrador", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });

    await expect(SuperAdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.espacios.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si el authId no tiene registro en Users", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue(null);

    await expect(SuperAdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("consulta el listado de espacios con su cantidad de usuarios", async () => {
    mockSesion("auth-3");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "SUPERADMIN" });
    (prisma.espacios.findMany as any).mockResolvedValue([]);

    await SuperAdminPage();

    expect(prisma.espacios.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { usuarios: true } } },
    });
  });
});
