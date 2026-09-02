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

vi.mock("@/lib/espacio-scope", () => ({
  usuarioVisibleEnEspacio: vi.fn(),
}));

import { resetearPasswordUsuario } from "./reset-user-password";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { resetSyncedUserPassword } from "@/lib/supabase/sync-user";
import { usuarioVisibleEnEspacio } from "@/lib/espacio-scope";

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

describe("resetearPasswordUsuario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Por defecto, visible en el espacio salvo que un test diga lo contrario.
    (usuarioVisibleEnEspacio as any).mockResolvedValue(true);
  });

  it("rechaza si no hay sesion activa", async () => {
    mockSesion(null);

    const resultado = await resetearPasswordUsuario(buildFormData({ usuarioId: "u1" }));

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });

  it("rechaza si quien llama no es Administrador ni Tutor", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ESTUDIANTE" });

    const resultado = await resetearPasswordUsuario(buildFormData({ usuarioId: "u1" }));

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });

  it("rechaza si falta el usuarioId", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });

    const resultado = await resetearPasswordUsuario(buildFormData({ usuarioId: "" }));

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario objetivo no existe", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR" }) // solicitante
      .mockResolvedValueOnce(null); // usuarioObjetivo

    const resultado = await resetearPasswordUsuario(
      buildFormData({ usuarioId: "no-existe" })
    );

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });

  it("un Tutor no puede restablecer la contraseña de otro Tutor", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "TUTOR", espacioId: "espacio-1" }) // solicitante
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-1", authId: "a1" }); // objetivo

    const resultado = await resetearPasswordUsuario(buildFormData({ usuarioId: "u1" }));

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });

  it("un Tutor si puede restablecer la contraseña de un Estudiante", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "TUTOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "ESTUDIANTE", espacioId: null, authId: "a1" });
    (resetSyncedUserPassword as any).mockResolvedValue(undefined);

    const resultado = await resetearPasswordUsuario(buildFormData({ usuarioId: "u1" }));

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

  it("un Administrador puede restablecer la contraseña de un Tutor", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-1", authId: "a1" });
    (resetSyncedUserPassword as any).mockResolvedValue(undefined);

    const resultado = await resetearPasswordUsuario(buildFormData({ usuarioId: "u1" }));

    expect(resultado.success).toBe(true);
  });

  it("rechaza si el usuario objetivo no tiene authId vinculado", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-1", authId: null });

    const resultado = await resetearPasswordUsuario(buildFormData({ usuarioId: "u1" }));

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });

  it("propaga el error si resetSyncedUserPassword falla", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-1", authId: "a1" });
    (resetSyncedUserPassword as any).mockRejectedValue(new Error("fallo de Auth"));

    const resultado = await resetearPasswordUsuario(buildFormData({ usuarioId: "u1" }));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el solicitante no tiene espacioId (US24, caso defensivo)", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR", espacioId: null })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-1", authId: "a1" });

    const resultado = await resetearPasswordUsuario(buildFormData({ usuarioId: "u1" }));

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });

  it("un Administrador no puede restablecer la contraseña de un usuario de otro espacio (US24)", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-2", authId: "a1" });
    (usuarioVisibleEnEspacio as any).mockResolvedValue(false);

    const resultado = await resetearPasswordUsuario(buildFormData({ usuarioId: "u1" }));

    expect(resultado.success).toBe(false);
    expect(resetSyncedUserPassword).not.toHaveBeenCalled();
  });
});
