import { describe, it, expect, vi, beforeEach } from "vitest";
import { crearEstudiante } from "./create-student";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSyncedUser } from "@/lib/supabase/sync-user";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/prisma", () => ({
  prisma: { users: { findUnique: vi.fn() } },
}));
vi.mock("@/lib/supabase/sync-user");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function buildFormData(data: Record<string, string>) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

describe("crearEstudiante", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesión", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const resultado = await crearEstudiante(
      null,
      buildFormData({ nombre: "Ana", apellido: "Pérez", email: "ana@test.com" })
    );

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el usuario no es tutor", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ rol: "ESTUDIANTE" } as any);

    const resultado = await crearEstudiante(
      null,
      buildFormData({ nombre: "Ana", apellido: "Pérez", email: "ana@test.com" })
    );

    expect(resultado.success).toBe(false);
  });

  it("rechaza email inválido", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ rol: "TUTOR" } as any);

    const resultado = await crearEstudiante(
      null,
      buildFormData({ nombre: "Ana", apellido: "Pérez", email: "no-es-email" })
    );

    expect(resultado.success).toBe(false);
  });

  it("crea el estudiante cuando el tutor está autenticado y los datos son válidos", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ rol: "TUTOR" } as any);
    vi.mocked(createSyncedUser).mockResolvedValue({} as any);

    const resultado = await crearEstudiante(
      null,
      buildFormData({ nombre: "Ana", apellido: "Pérez", email: "ana@test.com" })
    );

    expect(resultado.success).toBe(true);
    expect(createSyncedUser).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: "Ana",
        apellido: "Pérez",
        email: "ana@test.com",
        rol: "ESTUDIANTE",
      })
    );
  });

  it("propaga el error si createSyncedUser falla", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ rol: "TUTOR" } as any);
    vi.mocked(createSyncedUser).mockRejectedValue(new Error("fallo"));

    const resultado = await crearEstudiante(
      null,
      buildFormData({ nombre: "Ana", apellido: "Pérez", email: "ana@test.com" })
    );

    expect(resultado.success).toBe(false);
  });
});