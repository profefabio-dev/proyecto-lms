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
  updateSyncedUserEmail: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/espacio-scope", () => ({
  usuarioVisibleEnEspacio: vi.fn(),
}));

import { actualizarEmailUsuario } from "./update-user-email";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { updateSyncedUserEmail } from "@/lib/supabase/sync-user";
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

describe("actualizarEmailUsuario (US22)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Por defecto, visible en el espacio salvo que un test diga lo contrario.
    (usuarioVisibleEnEspacio as any).mockResolvedValue(true);
  });

  it("rechaza si no hay sesion activa", async () => {
    mockSesion(null);

    const resultado = await actualizarEmailUsuario(
      buildFormData({ usuarioId: "u1", nuevoEmail: "nuevo@example.com" })
    );

    expect(resultado.success).toBe(false);
    expect(updateSyncedUserEmail).not.toHaveBeenCalled();
  });

  it("rechaza si quien llama no es Administrador ni Tutor", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ESTUDIANTE" });

    const resultado = await actualizarEmailUsuario(
      buildFormData({ usuarioId: "u1", nuevoEmail: "nuevo@example.com" })
    );

    expect(resultado.success).toBe(false);
    expect(updateSyncedUserEmail).not.toHaveBeenCalled();
  });

  it("rechaza un email mal formado", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });

    const resultado = await actualizarEmailUsuario(
      buildFormData({ usuarioId: "u1", nuevoEmail: "no-es-un-email" })
    );

    expect(resultado.success).toBe(false);
    expect(updateSyncedUserEmail).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario objetivo no existe", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR" }) // solicitante
      .mockResolvedValueOnce(null); // usuarioObjetivo

    const resultado = await actualizarEmailUsuario(
      buildFormData({ usuarioId: "no-existe", nuevoEmail: "nuevo@example.com" })
    );

    expect(resultado.success).toBe(false);
    expect(updateSyncedUserEmail).not.toHaveBeenCalled();
  });

  it("un Tutor no puede editar el email de otro Tutor", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "TUTOR", espacioId: "espacio-1" }) // solicitante
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-1", email: "viejo@example.com", authId: "a1" }); // objetivo

    const resultado = await actualizarEmailUsuario(
      buildFormData({ usuarioId: "u1", nuevoEmail: "nuevo@example.com" })
    );

    expect(resultado.success).toBe(false);
    expect(updateSyncedUserEmail).not.toHaveBeenCalled();
  });

  it("un Tutor si puede editar el email de un Estudiante", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "TUTOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "ESTUDIANTE", espacioId: null, email: "viejo@example.com", authId: "a1" });
    (updateSyncedUserEmail as any).mockResolvedValue(undefined);

    const resultado = await actualizarEmailUsuario(
      buildFormData({ usuarioId: "u1", nuevoEmail: "nuevo@example.com" })
    );

    expect(resultado.success).toBe(true);
    expect(updateSyncedUserEmail).toHaveBeenCalledWith({
      usuarioId: "u1",
      authId: "a1",
      emailActual: "viejo@example.com",
      nuevoEmail: "nuevo@example.com",
    });
  });

  it("un Administrador puede editar el email de un Tutor", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-1", email: "viejo@example.com", authId: "a1" });
    (updateSyncedUserEmail as any).mockResolvedValue(undefined);

    const resultado = await actualizarEmailUsuario(
      buildFormData({ usuarioId: "u1", nuevoEmail: "nuevo@example.com" })
    );

    expect(resultado.success).toBe(true);
  });

  it("rechaza si el nuevo email es igual al actual", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-1", email: "igual@example.com", authId: "a1" });

    const resultado = await actualizarEmailUsuario(
      buildFormData({ usuarioId: "u1", nuevoEmail: "igual@example.com" })
    );

    expect(resultado.success).toBe(false);
    expect(updateSyncedUserEmail).not.toHaveBeenCalled();
  });

  it("propaga el error si updateSyncedUserEmail falla (por ejemplo, Auth rechaza el email)", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-1", email: "viejo@example.com", authId: "a1" });
    (updateSyncedUserEmail as any).mockRejectedValue(new Error("email ya en uso"));

    const resultado = await actualizarEmailUsuario(
      buildFormData({ usuarioId: "u1", nuevoEmail: "nuevo@example.com" })
    );

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el solicitante no tiene espacioId (US24, caso defensivo)", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR", espacioId: null })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-1", email: "viejo@example.com", authId: "a1" });

    const resultado = await actualizarEmailUsuario(
      buildFormData({ usuarioId: "u1", nuevoEmail: "nuevo@example.com" })
    );

    expect(resultado.success).toBe(false);
    expect(updateSyncedUserEmail).not.toHaveBeenCalled();
  });

  it("un Administrador no puede editar el email de un usuario de otro espacio (US24)", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-2", email: "viejo@example.com", authId: "a1" });
    (usuarioVisibleEnEspacio as any).mockResolvedValue(false);

    const resultado = await actualizarEmailUsuario(
      buildFormData({ usuarioId: "u1", nuevoEmail: "nuevo@example.com" })
    );

    expect(resultado.success).toBe(false);
    expect(updateSyncedUserEmail).not.toHaveBeenCalled();
  });
});
