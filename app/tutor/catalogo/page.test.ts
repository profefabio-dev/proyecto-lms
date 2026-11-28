/**
 * El catálogo de cursos compartidos (US48), con la aprobación previa de
 * US49 (28/11/2026).
 *
 * Esta pantalla es la única del proyecto que cruza espacios a propósito, así
 * que lo que importa de ella es **su consulta**: qué deja ver y qué no. Por
 * eso las pruebas la fijan en vez de mirar lo que dibuja.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findMany: vi.fn(), groupBy: vi.fn() },
  },
}));

import CatalogoPage from "./page";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function mockSesion(authUserId: string | null) {
  (createClient as any).mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: authUserId ? { id: authUserId } : null } }),
    },
  });
}

function params(q?: string) {
  return { searchParams: Promise.resolve(q === undefined ? {} : { q }) };
}

describe("CatalogoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "tutor-1", rol: "TUTOR" });
    (prisma.courses.findMany as any).mockResolvedValue([]);
    (prisma.courses.groupBy as any).mockResolvedValue([]);
  });

  it("redirige a /login si no hay sesión", async () => {
    mockSesion(null);

    await expect(CatalogoPage(params())).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.courses.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si quien entra no es Tutor", async () => {
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });

    await expect(CatalogoPage(params())).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("SOLO lista cursos compartidos Y verificados, y nunca los propios", async () => {
    // Las tres condiciones que sostienen la historia: `compartible` es la
    // intención del autor, `verificado` el visto bueno del administrador
    // (28/11/2026), y el propio curso no se ve a sí mismo en el catálogo.
    await CatalogoPage(params());

    const where = (prisma.courses.findMany as any).mock.calls[0][0].where;
    expect(where.compartible).toBe(true);
    expect(where.verificado).toBe(true);
    expect(where.tutorId).toEqual({ not: "tutor-1" });
  });

  it("no trae estudiantes, entregas ni notas del curso ajeno", async () => {
    // La otra mitad de la historia: del curso de otro docente solo se ve la
    // vitrina. Si algún día alguien agrega `inscritos` acá, esta prueba cae.
    await CatalogoPage(params());

    const select = (prisma.courses.findMany as any).mock.calls[0][0].select;
    expect(Object.keys(select).sort()).toEqual([
      "_count",
      "descripcion",
      "id",
      "imagen",
      "origenAutor",
      "titulo",
      "tutor",
      "verificado",
    ]);
  });

  it("busca por título y descripción cuando llega un término", async () => {
    await CatalogoPage(params("robótica"));

    const where = (prisma.courses.findMany as any).mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { titulo: { contains: "robótica", mode: "insensitive" } },
      { descripcion: { contains: "robótica", mode: "insensitive" } },
    ]);
  });

  it("cuenta las adopciones en una sola consulta para todo el catálogo", async () => {
    // Misma razón que en el panel de seguimiento (US39): una consulta por
    // curso convierte un catálogo de cien en cien viajes a la base.
    (prisma.courses.findMany as any).mockResolvedValue([
      {
        id: "c1",
        titulo: "Uno",
        descripcion: "d",
        imagen: null,
        origenAutor: null,
        verificado: true,
        tutor: { nombre: "Ana", apellido: "Ríos" },
        _count: { contenidos: 3, actividades: 1, quizzes: 1 },
      },
    ]);

    await CatalogoPage(params());

    expect(prisma.courses.groupBy).toHaveBeenCalledTimes(1);
  });
});
