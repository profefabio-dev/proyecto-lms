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
  createSyncedUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { crearTutor } from "./create-tutor";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSyncedUser } from "@/lib/supabase/sync-user";

function buildFormData(data: Record<string, string>) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.set(k, v));
  return fd;
}

describe("crearTutor (US02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesion activa", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const resultado = await crearTutor(buildFormData({ nombre: "A", apellido: "B", email: "a@b.com" }));

    expect(resultado.success).toBe(false);
    expect(createSyncedUser).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario autenticado no es Administrador", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    });
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR" });

    const resultado = await crearTutor(buildFormData({ nombre: "A", apellido: "B", email: "a@b.com" }));

    expect(resultado.success).toBe(false);
    expect(createSyncedUser).not.toHaveBeenCalled();
  });

  it("rechaza datos invalidos (email mal formado)", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    });
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });

    const resultado = await crearTutor(buildFormData({ nombre: "A", apellido: "B", email: "no-es-un-email" }));

    expect(resultado.success).toBe(false);
    expect(createSyncedUser).not.toHaveBeenCalled();
  });

  it("crea el tutor cuando quien llama es Administrador y los datos son validos", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    });
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });
    (createSyncedUser as any).mockResolvedValue({ id: "db-1" });

    const resultado = await crearTutor(
      buildFormData({ nombre: "Ana", apellido: "Gomez", email: "ana@example.com" })
    );

    expect(resultado.success).toBe(true);
    expect(createSyncedUser).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: "Ana", apellido: "Gomez", email: "ana@example.com", rol: "TUTOR" })
    );
  });

  it("pasa el espacioId del administrador que crea al tutor nuevo (US24/US26)", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    });
    (prisma.users.findUnique as any).mockResolvedValue({
      rol: "ADMINISTRADOR",
      espacioId: "espacio-1",
    });
    (createSyncedUser as any).mockResolvedValue({ id: "db-1" });

    await crearTutor(buildFormData({ nombre: "Ana", apellido: "Gomez", email: "ana@example.com" }));

    expect(createSyncedUser).toHaveBeenCalledWith(
      expect.objectContaining({ espacioId: "espacio-1" })
    );
  });

  it("propaga el error si createSyncedUser falla", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    });
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });
    (createSyncedUser as any).mockRejectedValue(new Error("email duplicado"));

    const resultado = await crearTutor(
      buildFormData({ nombre: "Ana", apellido: "Gomez", email: "ana@example.com" })
    );

    expect(resultado.success).toBe(false);
  });
});
