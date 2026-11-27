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
    grupos: {
      findMany: vi.fn(),
    },
  },
}));

import GruposPage from "./page";
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

describe("GruposPage (US32)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige a /login si no hay sesion activa", async () => {
    mockSesion(null);

    await expect(GruposPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.grupos.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si el usuario autenticado es ESTUDIANTE", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ESTUDIANTE" });

    await expect(GruposPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.grupos.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si el usuario no tiene espacioId", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR", espacioId: null });

    await expect(GruposPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.grupos.findMany).not.toHaveBeenCalled();
  });

  it("consulta solo los grupos del espacio del usuario autenticado", async () => {
    mockSesion("auth-3");
    (prisma.users.findUnique as any).mockResolvedValue({
      id: "tutor-1",
      rol: "TUTOR",
      espacioId: "espacio-1",
    });
    (prisma.grupos.findMany as any).mockResolvedValue([]);

    await GruposPage();

    expect(prisma.grupos.findMany).toHaveBeenCalledWith({
      where: { espacioId: "espacio-1" },
      include: {
        _count: {
          select: { estudiantes: true },
        },
      },
      orderBy: { nombre: "asc" },
    });
  });
});
