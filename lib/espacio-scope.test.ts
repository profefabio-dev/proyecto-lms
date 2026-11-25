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

/** Un estudiante sin espacio de origen, como los de antes de US50. */
function estudiante(extra: Record<string, unknown> = {}) {
  return { id: "est-1", rol: Rol.ESTUDIANTE, espacioId: null, espacioOrigenId: null, ...extra };
}

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

  // US50: las dos vías. La de inscripción es la de siempre; la del espacio de
  // origen es la que faltaba, y es la que permite que este filtro se pueda
  // usar en el selector de "Inscribir estudiantes" sin dejar fuera a los
  // estudiantes recién creados.
  it("un Estudiante es del espacio por inscripción O por donde se creó su cuenta", () => {
    expect(filtroUsuarioVisibleEnEspacio("espacio-1", Rol.ESTUDIANTE)).toEqual({
      rol: Rol.ESTUDIANTE,
      OR: [
        { inscripciones: { some: { course: { tutor: { espacioId: "espacio-1" } } } } },
        { espacioOrigenId: "espacio-1" },
      ],
    });
  });

  it("nunca filtra Estudiantes por espacioId propio, que no tienen", () => {
    const filtro = filtroUsuarioVisibleEnEspacio("espacio-1", Rol.ESTUDIANTE) as Record<
      string,
      unknown
    >;

    expect(filtro.espacioId).toBeUndefined();
  });

  it("sin rol, devuelve el OR de ambos casos", () => {
    expect(filtroUsuarioVisibleEnEspacio("espacio-1")).toEqual({
      OR: [
        { rol: { in: [Rol.ADMINISTRADOR, Rol.TUTOR] }, espacioId: "espacio-1" },
        {
          rol: Rol.ESTUDIANTE,
          OR: [
            { inscripciones: { some: { course: { tutor: { espacioId: "espacio-1" } } } } },
            { espacioOrigenId: "espacio-1" },
          ],
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
      usuarioVisibleEnEspacio(
        { id: "u1", rol: Rol.ADMINISTRADOR, espacioId: "espacio-1", espacioOrigenId: null },
        "espacio-1"
      )
    ).resolves.toBe(true);

    await expect(
      usuarioVisibleEnEspacio(
        { id: "u1", rol: Rol.ADMINISTRADOR, espacioId: "espacio-2", espacioOrigenId: null },
        "espacio-1"
      )
    ).resolves.toBe(false);

    expect(prisma.courseUsers.findFirst).not.toHaveBeenCalled();
  });

  it("un Tutor es visible solo si su espacioId coincide", async () => {
    await expect(
      usuarioVisibleEnEspacio(
        { id: "u1", rol: Rol.TUTOR, espacioId: "espacio-1", espacioOrigenId: null },
        "espacio-1"
      )
    ).resolves.toBe(true);

    await expect(
      usuarioVisibleEnEspacio(
        { id: "u1", rol: Rol.TUTOR, espacioId: null, espacioOrigenId: null },
        "espacio-1"
      )
    ).resolves.toBe(false);
  });

  it("un Estudiante es visible si tiene una inscripción en un curso del espacio", async () => {
    (prisma.courseUsers.findFirst as any).mockResolvedValue({ id: "insc-1" });

    const resultado = await usuarioVisibleEnEspacio(estudiante(), "espacio-1");

    expect(resultado).toBe(true);
    expect(prisma.courseUsers.findFirst).toHaveBeenCalledWith({
      where: { userId: "est-1", course: { tutor: { espacioId: "espacio-1" } } },
      select: { id: true },
    });
  });

  it("un Estudiante sin inscripciones en el espacio no es visible", async () => {
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);

    const resultado = await usuarioVisibleEnEspacio(estudiante(), "espacio-1");

    expect(resultado).toBe(false);
  });

  // US50: el caso que antes fallaba. Un Tutor creaba un estudiante y no podía
  // corregirle el nombre ni restablecerle la contraseña hasta inscribirlo en
  // algo, porque sin inscripciones no era "visible desde su espacio".
  it("un Estudiante recién creado en el espacio es visible aunque no tenga inscripciones", async () => {
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);

    const resultado = await usuarioVisibleEnEspacio(
      estudiante({ espacioOrigenId: "espacio-1" }),
      "espacio-1"
    );

    expect(resultado).toBe(true);
    // Ni hace falta ir a la base de datos: el dato ya venía en la cuenta.
    expect(prisma.courseUsers.findFirst).not.toHaveBeenCalled();
  });

  it("un Estudiante creado en OTRO espacio y sin inscripciones aquí no es visible", async () => {
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);

    const resultado = await usuarioVisibleEnEspacio(
      estudiante({ espacioOrigenId: "espacio-2" }),
      "espacio-1"
    );

    expect(resultado).toBe(false);
  });

  // Y al contrario: US26 sigue valiendo. Un estudiante creado en otro colegio
  // que SÍ está inscrito en un curso de este espacio se gestiona desde aquí.
  it("un Estudiante de otro espacio inscrito en un curso de este sí es visible", async () => {
    (prisma.courseUsers.findFirst as any).mockResolvedValue({ id: "insc-1" });

    const resultado = await usuarioVisibleEnEspacio(
      estudiante({ espacioOrigenId: "espacio-2" }),
      "espacio-1"
    );

    expect(resultado).toBe(true);
  });

  it("un Super Administrador nunca es visible desde un espacio", async () => {
    const resultado = await usuarioVisibleEnEspacio(
      { id: "sa-1", rol: Rol.SUPERADMIN, espacioId: null, espacioOrigenId: null },
      "espacio-1"
    );

    expect(resultado).toBe(false);
    expect(prisma.courseUsers.findFirst).not.toHaveBeenCalled();
  });
});
