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
  },
}));

import DashboardPage from "./page";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

describe("DashboardPage (US01/US05/US13 - redireccion por rol)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige a /login si no hay sesion activa", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirige a /admin si el rol es ADMINISTRADOR", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    });
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR", estado: "ACTIVO" });

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/admin");
  });

  it("redirige a /tutor si el rol es TUTOR", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-2" } } }) },
    });
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR", estado: "ACTIVO" });

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/tutor");
  });

  it("redirige a /estudiante si el rol es ESTUDIANTE", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-3" } } }) },
    });
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ESTUDIANTE", estado: "ACTIVO" });

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/estudiante");
  });

  it("redirige a /login con error si el usuario esta desactivado (US20)", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-5" } } }) },
    });
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ESTUDIANTE", estado: "INACTIVO" });

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login?error=cuenta_desactivada");
  });

  it("redirige a /login con error si el usuario de Auth no tiene registro en Users", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-4" } } }) },
    });
    (prisma.users.findUnique as any).mockResolvedValue(null);

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login?error=usuario_no_encontrado");
  });
});