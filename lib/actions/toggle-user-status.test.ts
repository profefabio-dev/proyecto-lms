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
  setSyncedUserActiveState: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/espacio-scope", () => ({
  usuarioVisibleEnEspacio: vi.fn(),
}));

import { alternarEstadoUsuario } from "./toggle-user-status";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { setSyncedUserActiveState } from "@/lib/supabase/sync-user";
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

describe("alternarEstadoUsuario (US20/US23)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Por defecto, visible en el espacio salvo que un test diga lo contrario.
    (usuarioVisibleEnEspacio as any).mockResolvedValue(true);
  });

  it("rechaza si no hay sesion activa", async () => {
    mockSesion(null);

    const resultado = await alternarEstadoUsuario(
      buildFormData({ usuarioId: "u1", accion: "desactivar" })
    );

    expect(resultado.success).toBe(false);
    expect(setSyncedUserActiveState).not.toHaveBeenCalled();
  });

  it("rechaza si quien llama no es Administrador", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "admin-1", rol: "TUTOR", espacioId: "espacio-1" });

    const resultado = await alternarEstadoUsuario(
      buildFormData({ usuarioId: "u1", accion: "desactivar" })
    );

    expect(resultado.success).toBe(false);
    expect(setSyncedUserActiveState).not.toHaveBeenCalled();
  });

  it("rechaza una accion invalida", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "admin-1", rol: "ADMINISTRADOR", espacioId: "espacio-1" });

    const resultado = await alternarEstadoUsuario(
      buildFormData({ usuarioId: "u1", accion: "borrar" })
    );

    expect(resultado.success).toBe(false);
    expect(setSyncedUserActiveState).not.toHaveBeenCalled();
  });

  it("un Administrador no puede desactivar su propia cuenta", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "admin-1", rol: "ADMINISTRADOR", espacioId: "espacio-1" });

    const resultado = await alternarEstadoUsuario(
      buildFormData({ usuarioId: "admin-1", accion: "desactivar" })
    );

    expect(resultado.success).toBe(false);
    expect(setSyncedUserActiveState).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario objetivo no existe", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ id: "admin-1", rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce(null);

    const resultado = await alternarEstadoUsuario(
      buildFormData({ usuarioId: "no-existe", accion: "desactivar" })
    );

    expect(resultado.success).toBe(false);
    expect(setSyncedUserActiveState).not.toHaveBeenCalled();
  });

  it("desactiva a un usuario existente", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ id: "admin-1", rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "ESTUDIANTE", espacioId: null, authId: "a1" });
    (setSyncedUserActiveState as any).mockResolvedValue(undefined);

    const resultado = await alternarEstadoUsuario(
      buildFormData({ usuarioId: "u1", accion: "desactivar" })
    );

    expect(resultado.success).toBe(true);
    expect(setSyncedUserActiveState).toHaveBeenCalledWith({
      usuarioId: "u1",
      authId: "a1",
      activar: false,
    });
  });

  it("reactiva a un usuario existente", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ id: "admin-1", rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-1", authId: "a1" });
    (setSyncedUserActiveState as any).mockResolvedValue(undefined);

    const resultado = await alternarEstadoUsuario(
      buildFormData({ usuarioId: "u1", accion: "reactivar" })
    );

    expect(resultado.success).toBe(true);
    expect(setSyncedUserActiveState).toHaveBeenCalledWith({
      usuarioId: "u1",
      authId: "a1",
      activar: true,
    });
  });

  it("propaga el error si setSyncedUserActiveState falla", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ id: "admin-1", rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-1", authId: "a1" });
    (setSyncedUserActiveState as any).mockRejectedValue(new Error("Auth no respondio"));

    const resultado = await alternarEstadoUsuario(
      buildFormData({ usuarioId: "u1", accion: "desactivar" })
    );

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el solicitante no tiene espacioId (US24, caso defensivo)", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ id: "admin-1", rol: "ADMINISTRADOR", espacioId: null })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-1", authId: "a1" });

    const resultado = await alternarEstadoUsuario(
      buildFormData({ usuarioId: "u1", accion: "desactivar" })
    );

    expect(resultado.success).toBe(false);
    expect(setSyncedUserActiveState).not.toHaveBeenCalled();
  });

  it("un Administrador no puede desactivar a un usuario de otro espacio (US24)", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ id: "admin-1", rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-2", authId: "a1" });
    (usuarioVisibleEnEspacio as any).mockResolvedValue(false);

    const resultado = await alternarEstadoUsuario(
      buildFormData({ usuarioId: "u1", accion: "desactivar" })
    );

    expect(resultado.success).toBe(false);
    expect(setSyncedUserActiveState).not.toHaveBeenCalled();
  });
});
