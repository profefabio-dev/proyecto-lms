/**
 * US54 — borrar un término del glosario (27/11/2026).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    glosario: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));

import { eliminarTermino } from "./delete-glossary-term";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function mockSesion(rol: string | null) {
  (createClient as any).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: rol ? { id: "auth-1" } : null } }),
    },
  });
  if (rol) {
    (prisma.users.findUnique as any).mockResolvedValue({ id: "tutor-1", rol });
  }
}

function formData() {
  const fd = new FormData();
  fd.set("terminoId", "term-1");
  return fd;
}

describe("eliminarTermino", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("TUTOR");
    (prisma.glosario.findUnique as any).mockResolvedValue({
      id: "term-1",
      courseId: "curso-1",
      course: { tutorId: "tutor-1" },
    });
    (prisma.glosario.delete as any).mockResolvedValue({ id: "term-1" });
  });

  it("rechaza si no hay sesión", async () => {
    mockSesion(null);

    const r = await eliminarTermino(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.glosario.delete).not.toHaveBeenCalled();
  });

  it("rechaza a quien no es Tutor", async () => {
    mockSesion("ESTUDIANTE");

    const r = await eliminarTermino(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.glosario.delete).not.toHaveBeenCalled();
  });

  it("RECHAZA borrar un término del glosario de otro tutor", async () => {
    // Sin esta guarda, conocer el id bastaría para vaciarle el glosario a
    // otro docente.
    (prisma.glosario.findUnique as any).mockResolvedValue({
      id: "term-1",
      courseId: "curso-1",
      course: { tutorId: "otro-tutor" },
    });

    const r = await eliminarTermino(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.glosario.delete).not.toHaveBeenCalled();
  });

  it("avisa si el término no existe", async () => {
    (prisma.glosario.findUnique as any).mockResolvedValue(null);

    const r = await eliminarTermino(null, formData());

    expect(r.success).toBe(false);
  });

  it("borra el término del curso propio", async () => {
    const r = await eliminarTermino(null, formData());

    expect(r.success).toBe(true);
    expect(prisma.glosario.delete).toHaveBeenCalledWith({ where: { id: "term-1" } });
  });

  it("pide el término y su curso en una sola consulta", async () => {
    await eliminarTermino(null, formData());

    expect((prisma.glosario.findUnique as any).mock.calls[0][0]).toHaveProperty("include");
  });

  it("informa el error y lo registra si falla el borrado", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    (prisma.glosario.delete as any).mockRejectedValue(new Error("se cayó la base"));

    const r = await eliminarTermino(null, formData());

    expect(r.success).toBe(false);
    expect(consola).toHaveBeenCalled();
    consola.mockRestore();
  });
});
