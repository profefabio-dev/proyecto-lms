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
      findMany: vi.fn(),
    },
  },
}));

// La página ahora renderiza <EditEmailForm>, que importa la Server Action
// de US22 y, en cadena, el cliente admin de Supabase (que necesita
// SUPABASE_SERVICE_ROLE_KEY en tiempo real). La mockeamos para que esta
// prueba siga siendo una prueba unitaria de la página, no de esa cadena.
// US20: la página ahora también renderiza <ToggleUserStatusForm>, que
// llega a la misma cadena de Supabase Auth por el mismo motivo.
vi.mock("@/lib/supabase/sync-user", () => ({
  updateSyncedUserEmail: vi.fn(),
  setSyncedUserActiveState: vi.fn(),
}));

import UsuariosPage from "./page";
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

describe("UsuariosPage (US03 - listado de usuarios para el Admin)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige a /login si no hay sesion activa", async () => {
    mockSesion(null);

    await expect(UsuariosPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.users.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si el usuario autenticado no es Administrador", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR" });

    await expect(UsuariosPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.users.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si el authId no tiene registro en Users", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue(null);

    await expect(UsuariosPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("consulta todos los usuarios sin filtro cuando no se pasa 'rol'", async () => {
    mockSesion("auth-3");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });
    (prisma.users.findMany as any).mockResolvedValue([]);

    await UsuariosPage({ searchParams: Promise.resolve({}) });

    expect(prisma.users.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { createdAt: "desc" },
    });
  });

  it("filtra por rol cuando se pasa un valor de rol valido", async () => {
    mockSesion("auth-4");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });
    (prisma.users.findMany as any).mockResolvedValue([]);

    await UsuariosPage({ searchParams: Promise.resolve({ rol: "TUTOR" }) });

    expect(prisma.users.findMany).toHaveBeenCalledWith({
      where: { rol: "TUTOR" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("ignora un valor de rol invalido y consulta sin filtro", async () => {
    mockSesion("auth-5");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });
    (prisma.users.findMany as any).mockResolvedValue([]);

    await UsuariosPage({ searchParams: Promise.resolve({ rol: "NO_EXISTE" }) });

    expect(prisma.users.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { createdAt: "desc" },
    });
  });
});
