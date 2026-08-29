import { describe, it, expect } from "vitest";
import { construirConteoPorRol } from "./admin-stats";

describe("construirConteoPorRol (US04)", () => {
  it("devuelve 0 para los tres roles cuando no hay usuarios", () => {
    expect(construirConteoPorRol([])).toEqual({
      ADMINISTRADOR: 0,
      TUTOR: 0,
      ESTUDIANTE: 0,
    });
  });

  it("rellena en 0 los roles ausentes del resultado de Prisma", () => {
    expect(
      construirConteoPorRol([{ rol: "ESTUDIANTE", _count: { _all: 12 } }])
    ).toEqual({
      ADMINISTRADOR: 0,
      TUTOR: 0,
      ESTUDIANTE: 12,
    });
  });

  it("mapea correctamente los tres roles cuando todos están presentes", () => {
    expect(
      construirConteoPorRol([
        { rol: "ADMINISTRADOR", _count: { _all: 1 } },
        { rol: "TUTOR", _count: { _all: 3 } },
        { rol: "ESTUDIANTE", _count: { _all: 20 } },
      ])
    ).toEqual({
      ADMINISTRADOR: 1,
      TUTOR: 3,
      ESTUDIANTE: 20,
    });
  });
});
