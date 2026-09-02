import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@/lib/supabase/sync-user", () => ({
  resetSyncedUserPassword: vi.fn(),
}));

import { restablecerPasswordAdministradorEspacio } from "./reset-espacio-admin-password";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { resetSyncedUserPassword } from "@/lib/supabase/sync-user";

function buildFormData(data: Record<string, string>) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.set(k, v));
  return fd;
}

function mockSesion(authUserId: string | null) {
  (createClient as any).mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: authUserId ? { id: authUserId } : null } }),
    },
  });
}

describe("restablecerPasswordAdministradorEspacio (OP03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesion activa", async () => {
    mockSesion(null);

    const resultado = await restablecerPasswordAdministradorEspacio(
      buildFormData({ usuarioId: "admin-1" })
    );

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });

  it("rechaza si quien llama no es Super Administrador", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "admin-1", rol: "ADMINISTRADOR" });

    const resultado = await restablecerPasswordAdministradorEspacio(
      buildFormData({ usuarioId: "admin-2" })
    );

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });

  it("rechaza si falta el usuarioId", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "sa-1", rol: "SUPERADMIN" });

    const resultado = await restablecerPasswordAdministradorEspacio(
      buildFormData({ usuarioId: "" })
    );

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario objetivo no existe", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ id: "sa-1", rol: "SUPERADMIN" }) // solicitante
      .mockResolvedValueOnce(null); // usuarioObjetivo

    const resultado = await restablecerPasswordAdministradorEspacio(
      buildFormData({ usuarioId: "no-existe" })
    );

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario objetivo no es Administrador (por ejemplo, Tutor)", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ id: "sa-1", rol: "SUPERADMIN" })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", authId: "a1" });

    const resultado = await restablecerPasswordAdministradorEspacio(
      buildFormData({ usuarioId: "u1" })
    );

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario objetivo no es Administrador (por ejemplo, Estudiante)", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ id: "sa-1", rol: "SUPERADMIN" })
      .mockResolvedValueOnce({ id: "u1", rol: "ESTUDIANTE", authId: "a1" });

    const resultado = await restablecerPasswordAdministradorEspacio(
      buildFormData({ usuarioId: "u1" })
    );

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });

  it("rechaza si el Administrador objetivo no tiene authId vinculado", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ id: "sa-1", rol: "SUPERADMIN" })
      .mockResolvedValueOnce({ id: "u1", rol: "ADMINISTRADOR", authId: null });

    const resultado = await restablecerPasswordAdministradorEspacio(
      buildFormData({ usuarioId: "u1" })
    );

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });

  it("restablece la contraseña de un Administrador de cualquier espacio", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ id: "sa-1", rol: "SUPERADMIN" })
      .mockResolvedValueOnce({ id: "u1", rol: "ADMINISTRADOR", espacioId: "espacio-2", authId: "a1" });
    (resetSyncedUserPassword as any).mockResolvedValue(undefined);

    const resultado = await restablecerPasswordAdministradorEspacio(
      buildFormData({ usuarioId: "u1" })
    );

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.passwordTemporal).toEqual(expect.any(String));
      expect(resultado.passwordTemporal.length).toBeGreaterThan(0);
    }
    expect(resetSyncedUserPassword).toHaveBeenCalledWith({
      authId: "a1",
      nuevoPassword: expect.any(String),
    });
  });

  it("propaga el error si resetSyncedUserPassword falla", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ id: "sa-1", rol: "SUPERADMIN" })
      .mockResolvedValueOnce({ id: "u1", rol: "ADMINISTRADOR", authId: "a1" });
    (resetSyncedUserPassword as any).mockRejectedValue(new Error("fallo de Auth"));

    const resultado = await restablecerPasswordAdministradorEspacio(
      buildFormData({ usuarioId: "u1" })
    );

    expect(resultado.success).toBe(false);
  });
});
