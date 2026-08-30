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
      include: { course: true },
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
});
