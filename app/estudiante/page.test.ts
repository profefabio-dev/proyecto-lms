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
    courseUsers: {
      findMany: vi.fn(),
    },
    contentViews: {
      findMany: vi.fn(),
    },
    // 22/11/2026: las consultas del bloque de novedades (cuatro entonces,
    // cinco desde US53, que agregó los anuncios del docente).
    anuncios: {
      findMany: vi.fn(),
    },
    entregas: {
      findMany: vi.fn(),
    },
    actividades: {
      findMany: vi.fn(),
    },
    contents: {
      findMany: vi.fn(),
    },
    quizzes: {
      findMany: vi.fn(),
    },
  },
}));

import EstudiantePage from "./page";
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

// Las cuatro consultas del bloque de novedades (22/11/2026). Casi todas
// las pruebas de esta página no van sobre novedades, así que por defecto
// se dejan vacías.
function mockNovedadesVacias() {
  (prisma.entregas.findMany as any).mockResolvedValue([]);
  (prisma.actividades.findMany as any).mockResolvedValue([]);
  (prisma.contents.findMany as any).mockResolvedValue([]);
  (prisma.quizzes.findMany as any).mockResolvedValue([]);
  (prisma.anuncios.findMany as any).mockResolvedValue([]);
}

describe("EstudiantePage (US14 minimo / US15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige a /login si no hay sesion activa", async () => {
    mockSesion(null);

    await expect(EstudiantePage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.courseUsers.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si el usuario autenticado no es Estudiante", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR" });

    await expect(EstudiantePage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.courseUsers.findMany).not.toHaveBeenCalled();
  });

  it("consulta las inscripciones (con tutor) y los contenidos visibles de cada curso", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courseUsers.findMany as any).mockResolvedValue([
      {
        id: "insc-1",
        courseId: "curso-1",
        course: {
          id: "curso-1",
          titulo: "Curso 1",
          estado: "PUBLICADO",
          contenidos: [
            { id: "c1", visible: true, seccionId: null },
            { id: "c2", visible: true, seccionId: null },
          ],
          secciones: [],
          tutor: { nombre: "Ana", apellido: "Ríos" },
        },
      },
    ]);
    (prisma.contentViews.findMany as any).mockResolvedValue([
      { contentId: "c1", vistoEn: new Date("2026-09-04T09:00:00") },
    ]);
    mockNovedadesVacias();

    await EstudiantePage();

    expect(prisma.courseUsers.findMany).toHaveBeenCalledWith({
      where: { userId: "est-1" },
      include: {
        course: {
          include: {
            contenidos: {
              where: { visible: true },
              orderBy: { orden: "asc" },
              // 26/11/2026: el panel pasó a mostrar la lección pendiente con
            // su número, título e ícono por tipo ("Continuar donde lo
            // dejaste"), así que la consulta trae tres campos más.
            select: {
              id: true,
              titulo: true,
              tipo: true,
              orden: true,
              visible: true,
              seccionId: true,
            },
            },
            secciones: { orderBy: { orden: "asc" }, select: { id: true, estado: true } },
            tutor: { select: { nombre: true, apellido: true } },
          },
        },
      },
      orderBy: { fecha: "desc" },
    });
    expect(prisma.contentViews.findMany).toHaveBeenCalledWith({
      where: { userId: "est-1" },
      select: { contentId: true, vistoEn: true },
    });
  });

  it("consulta las vistas del estudiante (para la racha) aunque no tenga inscripciones", async () => {
    mockSesion("auth-3");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courseUsers.findMany as any).mockResolvedValue([]);
    (prisma.contentViews.findMany as any).mockResolvedValue([]);

    await EstudiantePage();

    expect(prisma.contentViews.findMany).toHaveBeenCalledWith({
      where: { userId: "est-1" },
      select: { contentId: true, vistoEn: true },
    });
  });
});
