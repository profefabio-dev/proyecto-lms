/**
 * US53 — corregir un anuncio ya publicado (26/11/2026).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    anuncios: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { editarAnuncio } from "./edit-announcement";
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
  fd.set("anuncioId", "an-1");
  fd.set("titulo", "Mañana traigan la protoboard");
  fd.set("cuerpo", "La vamos a usar en el taller de la segunda hora.");
  for (const [clave, valor] of Object.entries(campos)) fd.set(clave, valor);
  return fd;
}

describe("editarAnuncio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("TUTOR");
    (prisma.anuncios.findUnique as any).mockResolvedValue({
      id: "an-1",
      courseId: "curso-1",
      tutorId: "quien-lo-escribio",
      course: { tutorId: "tutor-1" },
    });
    (prisma.anuncios.update as any).mockResolvedValue({ id: "an-1" });
  });

  it("rechaza si no hay sesión", async () => {
    mockSesion(null);

    const r = await editarAnuncio(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.anuncios.update).not.toHaveBeenCalled();
  });

  it("rechaza a quien no es Tutor", async () => {
    mockSesion("ESTUDIANTE");

    const r = await editarAnuncio(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.anuncios.update).not.toHaveBeenCalled();
  });

  it("RECHAZA el anuncio de un curso de otro tutor", async () => {
    (prisma.anuncios.findUnique as any).mockResolvedValue({
      id: "an-1",
      courseId: "curso-1",
      course: { tutorId: "otro-tutor" },
    });

    const r = await editarAnuncio(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.anuncios.update).not.toHaveBeenCalled();
  });

  it("rechaza un anuncio que no existe", async () => {
    (prisma.anuncios.findUnique as any).mockResolvedValue(null);

    const r = await editarAnuncio(null, formData());

    expect(r.success).toBe(false);
  });

  it("rechaza un título o un cuerpo demasiado cortos", async () => {
    expect((await editarAnuncio(null, formData({ titulo: "ok" }))).success).toBe(false);
    expect((await editarAnuncio(null, formData({ cuerpo: "corto" }))).success).toBe(false);
    expect(prisma.anuncios.update).not.toHaveBeenCalled();
  });

  it("guarda el título y el cuerpo recortados", async () => {
    const r = await editarAnuncio(
      null,
      formData({ titulo: "  Cambio de clase  ", cuerpo: "  La del jueves se corre al viernes.  " })
    );

    expect(r.success).toBe(true);
    expect((prisma.anuncios.update as any).mock.calls[0][0].data).toEqual({
      titulo: "Cambio de clase",
      cuerpo: "La del jueves se corre al viernes.",
    });
  });

  it("NO toca la fecha ni la autoría del anuncio", async () => {
    // Corregir una palabra no vuelve nuevo el anuncio (la fecha ordena las
    // novedades), y la autoría es de quien lo escribió, no de quien corrige.
    await editarAnuncio(null, formData());

    const datos = (prisma.anuncios.update as any).mock.calls[0][0].data;
    expect(Object.keys(datos).sort()).toEqual(["cuerpo", "titulo"]);
  });

  it("informa el error y lo registra si falla el guardado", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    (prisma.anuncios.update as any).mockRejectedValue(new Error("se cayó la base"));

    const r = await editarAnuncio(null, formData());

    expect(r.success).toBe(false);
    expect(consola).toHaveBeenCalled();
    consola.mockRestore();
  });
});
