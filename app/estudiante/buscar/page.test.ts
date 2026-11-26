import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
    },
    courses: {
      findMany: vi.fn(),
    },
    contents: {
      findMany: vi.fn(),
    },
  },
}));

import BuscarPage from "./page";
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

function buildSearchParams(q?: string) {
  return { searchParams: Promise.resolve(q === undefined ? {} : { q }) };
}

describe("BuscarPage (US17)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige a /login si no hay sesion activa", async () => {
    mockSesion(null);

    await expect(BuscarPage(buildSearchParams("html"))).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.courses.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si el usuario autenticado no es Estudiante", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR" });

    await expect(BuscarPage(buildSearchParams("html"))).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("no consulta nada si no se paso un termino de busqueda", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });

    await BuscarPage(buildSearchParams());

    expect(prisma.courses.findMany).not.toHaveBeenCalled();
    expect(prisma.contents.findMany).not.toHaveBeenCalled();
  });

  it("busca cursos inscritos y contenidos visibles que coincidan con el termino", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courses.findMany as any).mockResolvedValue([]);
    (prisma.contents.findMany as any).mockResolvedValue([]);

    await BuscarPage(buildSearchParams("html"));

    expect(prisma.courses.findMany).toHaveBeenCalledWith({
      where: {
        inscritos: { some: { userId: "est-1" } },
        OR: [
          { titulo: { contains: "html", mode: "insensitive" } },
          { descripcion: { contains: "html", mode: "insensitive" } },
        ],
      },
      orderBy: { titulo: "asc" },
    });
    expect(prisma.contents.findMany).toHaveBeenCalledWith({
      where: {
        visible: true,
        course: { inscritos: { some: { userId: "est-1" } } },
        OR: [
          { titulo: { contains: "html", mode: "insensitive" } },
          { descripcion: { contains: "html", mode: "insensitive" } },
        ],
      },
      // 26/11/2026: la pantalla pasó a traer solo lo que muestra del curso
      // (id y título) en vez del registro completo. Menos datos por consulta.
      include: { course: { select: { id: true, titulo: true } } },
      orderBy: { titulo: "asc" },
    });
  });

  it("recorta espacios en blanco del termino antes de buscar", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courses.findMany as any).mockResolvedValue([]);
    (prisma.contents.findMany as any).mockResolvedValue([]);

    await BuscarPage(buildSearchParams("  html  "));

    expect(prisma.courses.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { titulo: { contains: "html", mode: "insensitive" } },
            { descripcion: { contains: "html", mode: "insensitive" } },
          ],
        }),
      })
    );
  });

  it("no busca nada si el termino queda vacio despues de recortar espacios", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });

    await BuscarPage(buildSearchParams("   "));

    expect(prisma.courses.findMany).not.toHaveBeenCalled();
    expect(prisma.contents.findMany).not.toHaveBeenCalled();
  });

  // US51 (26/11/2026): buscar por código de clase. Lo pidió el docente
  // porque pegar el código en este buscador no encontraba nada — este
  // buscador mira solo los cursos donde el estudiante ya está inscrito, y al
  // curso de un código uno todavía no pertenece.
  describe("búsqueda por código de clase", () => {
    const CURSO = {
      id: "c8e14b2d-1111-2222-3333-444455556666",
      titulo: "Robótica educativa",
      descripcion: "Curso de prueba",
      tutor: { nombre: "Fabio", apellido: "Aguirre" },
      inscritos: [],
    };

    beforeEach(() => {
      mockSesion("auth-2");
      (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
      (prisma.contents.findMany as any).mockResolvedValue([]);
    });

    it("busca el curso por el comienzo de su id, solo entre los PUBLICADOS", async () => {
      (prisma.courses.findMany as any).mockResolvedValueOnce([CURSO]).mockResolvedValueOnce([]);

      await BuscarPage(buildSearchParams("C8E1-4B2D"));

      expect(prisma.courses.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          estado: "PUBLICADO",
          id: { startsWith: "c8e14b2d", mode: "insensitive" },
        },
        select: {
          id: true,
          titulo: true,
          descripcion: true,
          tutor: { select: { nombre: true, apellido: true } },
          // La inscripción del propio estudiante, para saber si hay que
          // ofrecerle inscribirse o decirle que ya está — en la misma
          // consulta, sin una segunda.
          inscritos: { where: { userId: "est-1" }, select: { id: true } },
        },
      });
    });

    it("NO consulta por código cuando el término no tiene esa forma", async () => {
      (prisma.courses.findMany as any).mockResolvedValue([]);

      await BuscarPage(buildSearchParams("robótica"));

      // Una sola consulta de cursos: la búsqueda normal de US17.
      expect(prisma.courses.findMany).toHaveBeenCalledTimes(1);
      expect((prisma.courses.findMany as any).mock.calls[0][0].where).not.toHaveProperty("estado");
    });

    it("sigue haciendo además la búsqueda normal con el código como texto", async () => {
      // Un código podría aparecer escrito en el título de una lección; no se
      // pierde nada por buscarlo también.
      (prisma.courses.findMany as any).mockResolvedValue([]);

      await BuscarPage(buildSearchParams("C8E1-4B2D"));

      expect(prisma.courses.findMany).toHaveBeenCalledTimes(2);
      expect((prisma.courses.findMany as any).mock.calls[1][0].where).toHaveProperty("inscritos");
    });
  });
});
