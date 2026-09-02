import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    courseUsers: {
      findFirst: vi.fn(),
    },
  },
}));

import { filtroUsuarioVisibleEnEspacio, usuarioVisibleEnEspacio } from "./espacio-scope";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";

describe("filtroUsuarioVisibleEnEspacio (US24)", () => {
  it("filtra Administradores/Tutores directamente por espacioId cuando se pasa ese rol", () => {
    expect(filtroUsuarioVisibleEnEspacio("espacio-1", Rol.ADMINISTRADOR)).toEqual({
      rol: Rol.ADMINISTRADOR,
      espacioId: "espacio-1",
    });
    expect(filtroUsuarioVisibleEnEspacio("espacio-1", Rol.TUTOR)).toEqual({
      rol: Rol.TUTOR,
      espacioId: "espacio-1",
    });
  });

  it("filtra Estudiantes por inscripción en un curso del espacio, no por espacioId propio", () => {
    expect(filtroUsuarioVisibleEnEspacio("espacio-1", Rol.ESTUDIANTE)).toEqual({
      rol: Rol.ESTUDIANTE,
      inscripciones: { some: { course: { tutor: { espacioId: "espacio-1" } } } },
    });
  });

  it("sin rol, devuelve el OR de ambos casos", () => {
    expect(filtroUsuarioVisibleEnEspacio("espacio-1")).toEqual({
      OR: [
        { rol: { in: [Rol.ADMINISTRADOR, Rol.TUTOR] }, espacioId: "espacio-1" },
        {
          rol: Rol.ESTUDIANTE,
          inscripciones: { some: { course: { tutor: { espacioId: "espacio-1" } } } },
        },
      ],
    });
  });
});

describe("usuarioVisibleEnEspacio (US24)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("un Administrador es visible solo si su espacioId coincide", async () => {
    await expect(
      usuarioVisibleEnEspacio({ id: "u1", rol: Rol.ADMINISTRADOR, espacioId: "espacio-1" }, "espacio-1")
    ).resolves.toBe(true);

    await expect(
      usuarioVisibleEnEspacio({ id: "u1", rol: Rol.ADMINISTRADOR, espacioId: "espacio-2" }, "espacio-1")
    ).resolves.toBe(false);

    expect(prisma.courseUsers.findFirst).not.toHaveBeenCalled();
  });

  it("un Tutor es visible solo si su espacioId coincide", async () => {
    await expect(
      usuarioVisibleEnEspacio({ id: "u1", rol: Rol.TUTOR, espacioId: "espacio-1" }, "espacio-1")
    ).resolves.toBe(true);

    await expect(
      usuarioVisibleEnEspacio({ id: "u1", rol: Rol.TUTOR, espacioId: null }, "espacio-1")
    ).resolves.toBe(false);
  });

  it("un Estudiante es visible si tiene una inscripción en un curso del espacio", async () => {
    (prisma.courseUsers.findFirst as any).mockResolvedValue({ id: "insc-1" });

    const resultado = await usuarioVisibleEnEspacio(
      { id: "est-1", rol: Rol.ESTUDIANTE, espacioId: null },
      "espacio-1"
    );

    expect(resultado).toBe(true);
    expect(prisma.courseUsers.findFirst).toHaveBeenCalledWith({
      where: { userId: "est-1", course: { tutor: { espacioId: "espacio-1" } } },
      select: { id: true },
    });
  });

  it("un Estudiante sin inscripciones en el espacio no es visible", async () => {
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);

    const resultado = await usuarioVisibleEnEspacio(
      { id: "est-1", rol: Rol.ESTUDIANTE, espacioId: null },
      "espacio-1"
    );

    expect(resultado).toBe(false);
  });

  it("un Super Administrador nunca es visible desde un espacio", async () => {
    const resultado = await usuarioVisibleEnEspacio(
      { id: "sa-1", rol: Rol.SUPERADMIN, espacioId: null },
      "espacio-1"
    );

    expect(resultado).toBe(false);
    expect(prisma.courseUsers.findFirst).not.toHaveBeenCalled();
  });
});
