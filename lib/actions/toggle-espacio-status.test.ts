import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    espacios: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase/sync-user", () => ({
  setSyncedUserActiveState: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { alternarEstadoEspacio } from "./toggle-espacio-status";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { setSyncedUserActiveState } from "@/lib/supabase/sync-user";

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

describe("alternarEstadoEspacio (US28)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesion activa", async () => {
    mockSesion(null);

    const resultado = await alternarEstadoEspacio(
      buildFormData({ espacioId: "espacio-1", accion: "desactivar" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.espacios.update).not.toHaveBeenCalled();
  });

  it("rechaza si quien llama no es Super Administrador", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "admin-1", rol: "ADMINISTRADOR" });

    const resultado = await alternarEstadoEspacio(
      buildFormData({ espacioId: "espacio-1", accion: "desactivar" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.espacios.update).not.toHaveBeenCalled();
  });

  it("rechaza una accion invalida", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "sa-1", rol: "SUPERADMIN" });

    const resultado = await alternarEstadoEspacio(
      buildFormData({ espacioId: "espacio-1", accion: "borrar" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.espacios.update).not.toHaveBeenCalled();
  });

  it("rechaza si el espacio no existe", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "sa-1", rol: "SUPERADMIN" });
    (prisma.espacios.findUnique as any).mockResolvedValue(null);

    const resultado = await alternarEstadoEspacio(
      buildFormData({ espacioId: "no-existe", accion: "desactivar" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.espacios.update).not.toHaveBeenCalled();
  });

  it("desactiva el espacio y a todos sus Administradores/Tutores", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "sa-1", rol: "SUPERADMIN" });
    (prisma.espacios.findUnique as any).mockResolvedValue({
      id: "espacio-1",
      nombre: "Espacio de prueba",
      estado: "ACTIVO",
    });
    (prisma.users.findMany as any).mockResolvedValue([
      { id: "u1", rol: "ADMINISTRADOR", authId: "a1" },
      { id: "u2", rol: "TUTOR", authId: "a2" },
    ]);
    (setSyncedUserActiveState as any).mockResolvedValue(undefined);

    const resultado = await alternarEstadoEspacio(
      buildFormData({ espacioId: "espacio-1", accion: "desactivar" })
    );

    expect(resultado.success).toBe(true);
    expect(prisma.users.findMany).toHaveBeenCalledWith({
      where: { espacioId: "espacio-1", rol: { in: ["ADMINISTRADOR", "TUTOR"] } },
    });
    expect(setSyncedUserActiveState).toHaveBeenCalledTimes(2);
    expect(setSyncedUserActiveState).toHaveBeenCalledWith({
      usuarioId: "u1",
      authId: "a1",
      activar: false,
    });
    expect(setSyncedUserActiveState).toHaveBeenCalledWith({
      usuarioId: "u2",
      authId: "a2",
      activar: false,
    });
    expect(prisma.espacios.update).toHaveBeenCalledWith({
      where: { id: "espacio-1" },
      data: { estado: "INACTIVO" },
    });
  });

  it("reactiva el espacio y a todos sus Administradores/Tutores", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "sa-1", rol: "SUPERADMIN" });
    (prisma.espacios.findUnique as any).mockResolvedValue({
      id: "espacio-1",
      nombre: "Espacio de prueba",
      estado: "INACTIVO",
    });
    (prisma.users.findMany as any).mockResolvedValue([
      { id: "u1", rol: "ADMINISTRADOR", authId: "a1" },
    ]);
    (setSyncedUserActiveState as any).mockResolvedValue(undefined);

    const resultado = await alternarEstadoEspacio(
      buildFormData({ espacioId: "espacio-1", accion: "reactivar" })
    );

    expect(resultado.success).toBe(true);
    expect(setSyncedUserActiveState).toHaveBeenCalledWith({
      usuarioId: "u1",
      authId: "a1",
      activar: true,
    });
    expect(prisma.espacios.update).toHaveBeenCalledWith({
      where: { id: "espacio-1" },
      data: { estado: "ACTIVO" },
    });
  });

  it("no falla si el espacio no tiene ningun Administrador ni Tutor todavia", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "sa-1", rol: "SUPERADMIN" });
    (prisma.espacios.findUnique as any).mockResolvedValue({
      id: "espacio-1",
      nombre: "Espacio vacio",
      estado: "ACTIVO",
    });
    (prisma.users.findMany as any).mockResolvedValue([]);

    const resultado = await alternarEstadoEspacio(
      buildFormData({ espacioId: "espacio-1", accion: "desactivar" })
    );

    expect(resultado.success).toBe(true);
    expect(setSyncedUserActiveState).not.toHaveBeenCalled();
    expect(prisma.espacios.update).toHaveBeenCalledWith({
      where: { id: "espacio-1" },
      data: { estado: "INACTIVO" },
    });
  });

  it("si falla la sincronizacion de un usuario, revierte a los ya sincronizados y no toca el estado del espacio", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "sa-1", rol: "SUPERADMIN" });
    (prisma.espacios.findUnique as any).mockResolvedValue({
      id: "espacio-1",
      nombre: "Espacio de prueba",
      estado: "ACTIVO",
    });
    (prisma.users.findMany as any).mockResolvedValue([
      { id: "u1", rol: "ADMINISTRADOR", authId: "a1" },
      { id: "u2", rol: "TUTOR", authId: "a2" },
    ]);
    (setSyncedUserActiveState as any)
      .mockResolvedValueOnce(undefined) // u1 se sincroniza bien
      .mockRejectedValueOnce(new Error("Auth no respondio")) // u2 falla
      .mockResolvedValueOnce(undefined); // reversion de u1

    const resultado = await alternarEstadoEspacio(
      buildFormData({ espacioId: "espacio-1", accion: "desactivar" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.espacios.update).not.toHaveBeenCalled();
    expect(setSyncedUserActiveState).toHaveBeenCalledWith({
      usuarioId: "u1",
      authId: "a1",
      activar: true,
    });
  });
});
