/**
 * US53 — publicar un anuncio en un curso propio (25/11/2026).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findUnique: vi.fn() },
    anuncios: { create: vi.fn() },
  },
}));

import { crearAnuncio } from "./create-announcement";
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

function formData(campos: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("courseId", "curso-1");
  fd.set("titulo", "Mañana traigan la protoboard");
  fd.set("cuerpo", "La vamos a usar en el taller de la segunda hora.");
  for (const [clave, valor] of Object.entries(campos)) fd.set(clave, valor);
  return fd;
}

describe("crearAnuncio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("TUTOR");
    (prisma.courses.findUnique as any).mockResolvedValue({ id: "curso-1", tutorId: "tutor-1" });
    (prisma.anuncios.create as any).mockResolvedValue({ id: "an-1" });
  });

  it("rechaza si no hay sesión", async () => {
    mockSesion(null);

    const r = await crearAnuncio(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.anuncios.create).not.toHaveBeenCalled();
  });

  it("rechaza a quien no es Tutor", async () => {
    mockSesion("ESTUDIANTE");

    const r = await crearAnuncio(null, formData());

    expect(r).toEqual({ success: false, error: "Solo un tutor puede publicar anuncios." });
    expect(prisma.anuncios.create).not.toHaveBeenCalled();
  });

  it("RECHAZA publicar en el curso de otro tutor", async () => {
    (prisma.courses.findUnique as any).mockResolvedValue({ id: "curso-1", tutorId: "otro-tutor" });

    const r = await crearAnuncio(null, formData());

    expect(r).toEqual({ success: false, error: "Este curso no existe o no te pertenece." });
    expect(prisma.anuncios.create).not.toHaveBeenCalled();
  });

  it("rechaza un título demasiado corto", async () => {
    const r = await crearAnuncio(null, formData({ titulo: "ok" }));

    expect(r.success).toBe(false);
    expect(prisma.anuncios.create).not.toHaveBeenCalled();
  });

  it("rechaza un anuncio sin cuerpo", async () => {
    const r = await crearAnuncio(null, formData({ cuerpo: "   " }));

    expect(r.success).toBe(false);
    expect(prisma.anuncios.create).not.toHaveBeenCalled();
  });

  it("publica el anuncio guardando quién lo escribió", async () => {
    const r = await crearAnuncio(null, formData());

    expect(r).toEqual({ success: true });
    expect(prisma.anuncios.create).toHaveBeenCalledWith({
      data: {
        courseId: "curso-1",
        // El autor se guarda, no se deduce del curso: un curso adoptado
        // puede cambiar de manos y el anuncio sigue siendo de quien lo
        // escribió.
        tutorId: "tutor-1",
        titulo: "Mañana traigan la protoboard",
        cuerpo: "La vamos a usar en el taller de la segunda hora.",
      },
    });
  });

  it("devuelve un error controlado si la base de datos falla", async () => {
    (prisma.anuncios.create as any).mockRejectedValue(new Error("db caída"));

    const r = await crearAnuncio(null, formData());

    expect(r).toEqual({
      success: false,
      error: "No se pudo publicar el anuncio. Intenta de nuevo.",
    });
  });
});
