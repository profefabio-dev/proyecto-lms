/**
 * US54 — agregar un término al glosario de un curso propio (27/11/2026).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findUnique: vi.fn() },
    glosario: { create: vi.fn() },
  },
}));

import { crearTermino } from "./create-glossary-term";
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

function mockCurso(terminos: string[] = [], tutorId = "tutor-1") {
  (prisma.courses.findUnique as any).mockResolvedValue({
    tutorId,
    glosario: terminos.map((termino) => ({ termino })),
  });
}

function formData(campos: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("courseId", "curso-1");
  fd.set("termino", "Algoritmo");
  fd.set("definicion", "Una serie de pasos ordenados para resolver un problema.");
  for (const [clave, valor] of Object.entries(campos)) fd.set(clave, valor);
  return fd;
}

describe("crearTermino", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("TUTOR");
    mockCurso();
    (prisma.glosario.create as any).mockResolvedValue({ id: "term-1" });
  });

  it("rechaza si no hay sesión", async () => {
    mockSesion(null);

    const r = await crearTermino(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.glosario.create).not.toHaveBeenCalled();
  });

  it("rechaza a quien no es Tutor", async () => {
    mockSesion("ESTUDIANTE");

    const r = await crearTermino(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.glosario.create).not.toHaveBeenCalled();
  });

  it("RECHAZA escribir en el glosario de un curso ajeno", async () => {
    mockCurso([], "otro-tutor");

    const r = await crearTermino(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.glosario.create).not.toHaveBeenCalled();
  });

  it("rechaza un término o una definición demasiado cortos", async () => {
    expect((await crearTermino(null, formData({ termino: "a" }))).success).toBe(false);
    expect((await crearTermino(null, formData({ definicion: "corta" }))).success).toBe(false);
    expect(prisma.glosario.create).not.toHaveBeenCalled();
  });

  it("guarda el término tal como lo escribió el docente, con sus acentos", async () => {
    const r = await crearTermino(null, formData({ termino: "  Código fuente  " }));

    expect(r.success).toBe(true);
    expect((prisma.glosario.create as any).mock.calls[0][0].data).toEqual({
      courseId: "curso-1",
      termino: "Código fuente",
      definicion: "Una serie de pasos ordenados para resolver un problema.",
    });
  });

  it("RECHAZA un término repetido, aunque esté escrito con otras mayúsculas", async () => {
    mockCurso(["Algoritmo"]);

    const r = await crearTermino(null, formData({ termino: "algoritmo" }));

    expect(r.success).toBe(false);
    expect(prisma.glosario.create).not.toHaveBeenCalled();
  });

  it("RECHAZA un término repetido escrito sin acento", async () => {
    // "Código" y "Codigo" conviven en una lista escrita a mano, y guardar las
    // dos sería un error visible para el estudiante.
    mockCurso(["Código"]);

    const r = await crearTermino(null, formData({ termino: "Codigo" }));

    expect(r.success).toBe(false);
    expect(prisma.glosario.create).not.toHaveBeenCalled();
  });

  it("acepta dos términos distintos que empiezan igual", async () => {
    mockCurso(["Variable"]);

    const r = await crearTermino(null, formData({ termino: "Variable de entorno" }));

    expect(r.success).toBe(true);
  });

  it("informa el error y lo registra si falla el guardado", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    (prisma.glosario.create as any).mockRejectedValue(new Error("se cayó la base"));

    const r = await crearTermino(null, formData());

    expect(r.success).toBe(false);
    expect(consola).toHaveBeenCalled();
    consola.mockRestore();
  });
});
