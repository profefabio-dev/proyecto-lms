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

// La página renderiza <CreateStudentForm> (US06, llega a createSyncedUser en
// cadena), <EditEmailForm> (US22) y <ResetPasswordForm> (OP01) — todas
// terminan importando el cliente admin de Supabase. Se mockea todo el
// módulo para que esta siga siendo una prueba unitaria de la página.
vi.mock("@/lib/supabase/sync-user", () => ({
  createSyncedUser: vi.fn(),
  updateSyncedUserEmail: vi.fn(),
  resetSyncedUserPassword: vi.fn(),
}));

import EstudiantesPage from "./page";
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

describe("EstudiantesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige a /login si no hay sesion activa", async () => {
    mockSesion(null);

    await expect(EstudiantesPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.users.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si el usuario autenticado no es Tutor", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });

    await expect(EstudiantesPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.users.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si el Tutor no tiene espacioId (US24, caso defensivo)", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR", espacioId: null });

    await expect(EstudiantesPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.users.findMany).not.toHaveBeenCalled();
  });

  it("consulta solo los Estudiantes inscritos en un curso del espacio del Tutor (US24)", async () => {
    mockSesion("auth-3");
    (prisma.users.findUnique as any).mockResolvedValue({
      rol: "TUTOR",
      espacioId: "espacio-1",
    });
    (prisma.users.findMany as any).mockResolvedValue([]);

    await EstudiantesPage();

    expect(prisma.users.findMany).toHaveBeenCalledWith({
      where: {
        rol: "ESTUDIANTE",
        inscripciones: { some: { course: { tutor: { espacioId: "espacio-1" } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  });
});
