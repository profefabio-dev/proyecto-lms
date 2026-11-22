/**
 * Bloque D.3 de `Checklist_Validacion_Manual.md`, automatizado (23/11/2026).
 *
 * La prueba manual era: pedir por URL una ruta en borrador y esperar un
 * 404. Importa porque el catálogo del estudiante solo lista las publicadas,
 * así que la única forma de llegar a una en borrador es escribiendo su id —
 * y una ruta en borrador es trabajo a medias del tutor, con cursos que
 * todavía no quiere mostrar.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    rutas: { findUnique: vi.fn() },
    contentViews: { findMany: vi.fn() },
  },
}));

import RutaEstudiantePage from "./page";
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

const PARAMS = Promise.resolve({ rutaId: "ruta-1" });

function rutaPublicada() {
  return {
    id: "ruta-1",
    titulo: "Ruta de prueba",
    descripcion: "Una ruta",
    estado: "PUBLICADA",
    tutor: { nombre: "Ana", apellido: "Ríos" },
    inscritos: [],
    cursos: [
      {
        id: "rc-1",
        orden: 0,
        course: {
          id: "curso-1",
          titulo: "Curso 1",
          descripcion: "Desc",
          estado: "PUBLICADO",
          contenidos: [{ id: "c1", visible: true, seccionId: null }],
          secciones: [],
        },
      },
    ],
  };
}

describe("RutaEstudiantePage — seguridad (bloque D.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({
      id: "est-1",
      rol: "ESTUDIANTE",
      nombre: "Ana",
      apellido: "Pérez",
    });
    (prisma.rutas.findUnique as any).mockResolvedValue(rutaPublicada());
    (prisma.contentViews.findMany as any).mockResolvedValue([]);
  });

  it("da 404 en una ruta en BORRADOR, aunque se conozca su id", async () => {
    (prisma.rutas.findUnique as any).mockResolvedValue({
      ...rutaPublicada(),
      estado: "BORRADOR",
    });

    await expect(RutaEstudiantePage({ params: PARAMS })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("da 404 si la ruta no existe", async () => {
    (prisma.rutas.findUnique as any).mockResolvedValue(null);

    await expect(RutaEstudiantePage({ params: PARAMS })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("deja ver una ruta publicada", async () => {
    await expect(RutaEstudiantePage({ params: PARAMS })).resolves.toBeDefined();
  });

  it("manda al login a quien no es Estudiante", async () => {
    (prisma.users.findUnique as any).mockResolvedValue({ id: "t-1", rol: "TUTOR" });

    await expect(RutaEstudiantePage({ params: PARAMS })).rejects.toThrow("NEXT_REDIRECT");
    expect(prisma.rutas.findUnique).not.toHaveBeenCalled();
  });
});
