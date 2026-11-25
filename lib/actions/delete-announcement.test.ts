/**
 * US53 — borrar un anuncio (25/11/2026).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    anuncios: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));

import { eliminarAnuncio } from "./delete-announcement";
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

function formData(anuncioId = "an-1") {
  const fd = new FormData();
  fd.set("anuncioId", anuncioId);
  return fd;
}

describe("eliminarAnuncio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("TUTOR");
    (prisma.anuncios.findUnique as any).mockResolvedValue({
      id: "an-1",
      courseId: "curso-1",
      course: { id: "curso-1", tutorId: "tutor-1" },
    });
    (prisma.anuncios.delete as any).mockResolvedValue({});
  });

  it("rechaza si no hay sesión", async () => {
    mockSesion(null);

    const r = await eliminarAnuncio(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.anuncios.delete).not.toHaveBeenCalled();
  });

  it("rechaza a quien no es Tutor", async () => {
    mockSesion("ESTUDIANTE");

    const r = await eliminarAnuncio(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.anuncios.delete).not.toHaveBeenCalled();
  });

  it("RECHAZA borrar un anuncio de un curso ajeno", async () => {
    (prisma.anuncios.findUnique as any).mockResolvedValue({
      id: "an-1",
      courseId: "curso-1",
      course: { id: "curso-1", tutorId: "otro-tutor" },
    });

    const r = await eliminarAnuncio(null, formData());

    expect(r).toEqual({ success: false, error: "Este anuncio no existe o no te pertenece." });
    expect(prisma.anuncios.delete).not.toHaveBeenCalled();
  });

  it("avisa si el anuncio no existe", async () => {
    (prisma.anuncios.findUnique as any).mockResolvedValue(null);

    const r = await eliminarAnuncio(null, formData());

    expect(r.success).toBe(false);
  });

  it("pide el anuncio junto con su curso, en una sola consulta", async () => {
    await eliminarAnuncio(null, formData());

    expect(prisma.anuncios.findUnique).toHaveBeenCalledWith({
      where: { id: "an-1" },
      include: { course: true },
    });
  });

  it("borra el anuncio del propio curso", async () => {
    const r = await eliminarAnuncio(null, formData());

    expect(r).toEqual({ success: true });
    expect(prisma.anuncios.delete).toHaveBeenCalledWith({ where: { id: "an-1" } });
  });

  it("devuelve un error controlado si la base de datos falla", async () => {
    (prisma.anuncios.delete as any).mockRejectedValue(new Error("db caída"));

    const r = await eliminarAnuncio(null, formData());

    expect(r).toEqual({ success: false, error: "No se pudo borrar el anuncio. Intenta de nuevo." });
  });
});
