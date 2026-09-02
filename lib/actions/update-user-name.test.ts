import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/espacio-scope", () => ({
  usuarioVisibleEnEspacio: vi.fn(),
}));

import { actualizarNombreUsuario } from "./update-user-name";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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

describe("actualizarNombreUsuario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Por defecto, visible en el espacio salvo que un test diga lo contrario.
    (usuarioVisibleEnEspacio as any).mockResolvedValue(true);
  });

  it("rechaza si no hay sesion activa", async () => {
    mockSesion(null);

    const resultado = await actualizarNombreUsuario(
      buildFormData({ usuarioId: "u1", nombre: "Ana", apellido: "Gómez" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it("rechaza si quien llama no es Administrador ni Tutor", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ESTUDIANTE" });

    const resultado = await actualizarNombreUsuario(
      buildFormData({ usuarioId: "u1", nombre: "Ana", apellido: "Gómez" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it("rechaza nombre o apellido demasiado cortos", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });

    const resultado = await actualizarNombreUsuario(
      buildFormData({ usuarioId: "u1", nombre: "A", apellido: "Gómez" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it("un Tutor no puede editar a otro Tutor", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "TUTOR", espacioId: "espacio-1" }) // solicitante
      .mockResolvedValueOnce({ id: "u1", rol: "TUTOR", espacioId: "espacio-1", nombre: "Ana", apellido: "Gómez" }); // objetivo

    const resultado = await actualizarNombreUsuario(
      buildFormData({ usuarioId: "u1", nombre: "Ana", apellido: "Gómez Ruiz" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it("un Tutor puede editar a un Estudiante", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "TUTOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "ESTUDIANTE", espacioId: null, nombre: "Ana", apellido: "Gómez" });
    (prisma.users.update as any).mockResolvedValue({});

    const resultado = await actualizarNombreUsuario(
      buildFormData({ usuarioId: "u1", nombre: "Ana", apellido: "Gómez Ruiz" })
    );

    expect(resultado.success).toBe(true);
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { nombre: "Ana", apellido: "Gómez Ruiz" },
    });
  });

  it("un Administrador puede editar a otro Administrador de su mismo espacio", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u2", rol: "ADMINISTRADOR", espacioId: "espacio-1", nombre: "Luis", apellido: "Pérez" });
    (prisma.users.update as any).mockResolvedValue({});

    const resultado = await actualizarNombreUsuario(
      buildFormData({ usuarioId: "u2", nombre: "Luis", apellido: "Pérez Díaz" })
    );

    expect(resultado.success).toBe(true);
  });

  it("rechaza si no hay cambios reales", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u1", rol: "ESTUDIANTE", espacioId: null, nombre: "Ana", apellido: "Gómez" });

    const resultado = await actualizarNombreUsuario(
      buildFormData({ usuarioId: "u1", nombre: "Ana", apellido: "Gómez" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it("rechaza si el solicitante no tiene espacioId (US24, caso defensivo)", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR", espacioId: null })
      .mockResolvedValueOnce({ id: "u1", rol: "ESTUDIANTE", espacioId: null, nombre: "Ana", apellido: "Gómez" });

    const resultado = await actualizarNombreUsuario(
      buildFormData({ usuarioId: "u1", nombre: "Ana", apellido: "Gómez Ruiz" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it("un Administrador no puede editar a un Administrador de otro espacio (US24)", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any)
      .mockResolvedValueOnce({ rol: "ADMINISTRADOR", espacioId: "espacio-1" })
      .mockResolvedValueOnce({ id: "u2", rol: "ADMINISTRADOR", espacioId: "espacio-2", nombre: "Luis", apellido: "Pérez" });
    (usuarioVisibleEnEspacio as any).mockResolvedValue(false);

    const resultado = await actualizarNombreUsuario(
      buildFormData({ usuarioId: "u2", nombre: "Luis", apellido: "Pérez Díaz" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.users.update).not.toHaveBeenCalled();
  });
});
