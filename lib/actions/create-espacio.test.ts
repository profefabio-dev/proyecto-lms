import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
    },
    espacios: {
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase/sync-user", () => ({
  createSyncedUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { crearEspacio } from "./create-espacio";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSyncedUser } from "@/lib/supabase/sync-user";

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

describe("crearEspacio (US25)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesion activa", async () => {
    mockSesion(null);

    const resultado = await crearEspacio(
      buildFormData({
        nombreEspacio: "Nuevo Docente",
        nombre: "Ana",
        apellido: "Gomez",
        email: "ana@example.com",
      })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.espacios.create).not.toHaveBeenCalled();
  });

  it("rechaza si quien llama no es Super Administrador", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });

    const resultado = await crearEspacio(
      buildFormData({
        nombreEspacio: "Nuevo Docente",
        nombre: "Ana",
        apellido: "Gomez",
        email: "ana@example.com",
      })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.espacios.create).not.toHaveBeenCalled();
  });

  it("rechaza datos invalidos (email mal formado)", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "SUPERADMIN" });

    const resultado = await crearEspacio(
      buildFormData({
        nombreEspacio: "Nuevo Docente",
        nombre: "Ana",
        apellido: "Gomez",
        email: "no-es-un-email",
      })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.espacios.create).not.toHaveBeenCalled();
  });

  it("rechaza si falta el nombre del espacio", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "SUPERADMIN" });

    const resultado = await crearEspacio(
      buildFormData({
        nombreEspacio: "",
        nombre: "Ana",
        apellido: "Gomez",
        email: "ana@example.com",
      })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.espacios.create).not.toHaveBeenCalled();
  });

  it("crea el espacio y su primer Administrador cuando los datos son validos", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "SUPERADMIN" });
    (prisma.espacios.create as any).mockResolvedValue({ id: "espacio-nuevo" });
    (createSyncedUser as any).mockResolvedValue({ id: "db-1" });

    const resultado = await crearEspacio(
      buildFormData({
        nombreEspacio: "Nuevo Docente",
        nombre: "Ana",
        apellido: "Gomez",
        email: "ana@example.com",
      })
    );

    expect(resultado.success).toBe(true);
    expect(prisma.espacios.create).toHaveBeenCalledWith({
      data: { nombre: "Nuevo Docente" },
    });
    expect(createSyncedUser).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: "Ana",
        apellido: "Gomez",
        email: "ana@example.com",
        rol: "ADMINISTRADOR",
        espacioId: "espacio-nuevo",
      })
    );
    expect(prisma.espacios.delete).not.toHaveBeenCalled();
  });

  it("si falla la creacion del Administrador, revierte (borra) el espacio recien creado", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "SUPERADMIN" });
    (prisma.espacios.create as any).mockResolvedValue({ id: "espacio-nuevo" });
    (createSyncedUser as any).mockRejectedValue(new Error("email duplicado"));

    const resultado = await crearEspacio(
      buildFormData({
        nombreEspacio: "Nuevo Docente",
        nombre: "Ana",
        apellido: "Gomez",
        email: "ana@example.com",
      })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.espacios.delete).toHaveBeenCalledWith({ where: { id: "espacio-nuevo" } });
  });
});
