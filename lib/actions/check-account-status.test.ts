import { describe, it, expect, vi, beforeEach } from "vitest";
import { correoPerteneceACuentaDesactivada } from "./check-account-status";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { users: { findUnique: vi.fn() } },
}));

describe("correoPerteneceACuentaDesactivada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve false si el email viene vacío (sin consultar la base de datos)", async () => {
    const resultado = await correoPerteneceACuentaDesactivada("   ");

    expect(resultado).toBe(false);
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it("devuelve false si el email no existe en Users", async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null as any);

    const resultado = await correoPerteneceACuentaDesactivada("nadie@test.com");

    expect(resultado).toBe(false);
  });

  it("devuelve false si la cuenta existe y está activa", async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ estado: "ACTIVO" } as any);

    const resultado = await correoPerteneceACuentaDesactivada("activo@test.com");

    expect(resultado).toBe(false);
  });

  it("devuelve true si la cuenta existe y está desactivada", async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ estado: "INACTIVO" } as any);

    const resultado = await correoPerteneceACuentaDesactivada("inactivo@test.com");

    expect(resultado).toBe(true);
  });

  it("recorta espacios en el email antes de consultar", async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ estado: "INACTIVO" } as any);

    await correoPerteneceACuentaDesactivada("  inactivo@test.com  ");

    expect(prisma.users.findUnique).toHaveBeenCalledWith({
      where: { email: "inactivo@test.com" },
      select: { estado: true },
    });
  });
});
