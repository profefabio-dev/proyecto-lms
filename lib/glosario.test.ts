/**
 * US54 — el glosario del curso (27/11/2026).
 */
import { describe, it, expect } from "vitest";
import {
  agruparPorLetra,
  normalizarTermino,
  ordenarTerminos,
  terminoRepetido,
} from "./glosario";

function t(termino: string) {
  return { termino, definicion: "x", id: termino };
}

describe("normalizarTermino", () => {
  it("ignora mayúsculas y espacios de sobra", () => {
    expect(normalizarTermino("  ALGORITMO  ")).toBe("algoritmo");
  });

  it("ignora acentos", () => {
    // "Código" y "Codigo" conviven en una lista escrita a mano.
    expect(normalizarTermino("Código")).toBe("codigo");
    expect(normalizarTermino("Código")).toBe(normalizarTermino("codigo"));
  });

  it("no confunde la ñ con la n", () => {
    // Quitar acentos no puede volver "año" un "ano". Lo atrapó esta prueba:
    // la primera versión descomponía y borraba las marcas sin proteger la ñ.
    expect(normalizarTermino("Diseño")).toBe("diseño");
    expect(normalizarTermino("Diseño")).not.toBe(normalizarTermino("Diseno"));
  });

  it("sí quita la diéresis, que no es una letra aparte", () => {
    expect(normalizarTermino("Pingüino")).toBe(normalizarTermino("Pinguino"));
  });
});

describe("terminoRepetido", () => {
  it("detecta el mismo término escrito distinto", () => {
    expect(terminoRepetido("algoritmo", ["Algoritmo", "Variable"])).toBe(true);
    expect(terminoRepetido("CÓDIGO", ["Codigo"])).toBe(true);
  });

  it("acepta un término nuevo", () => {
    expect(terminoRepetido("Protoboard", ["Algoritmo", "Variable"])).toBe(false);
  });

  it("con el glosario vacío nunca está repetido", () => {
    expect(terminoRepetido("Algoritmo", [])).toBe(false);
  });
});

describe("ordenarTerminos", () => {
  it("ordena alfabéticamente con las reglas del español", () => {
    const orden = ordenarTerminos([t("Variable"), t("Árbol"), t("Bucle")]).map((x) => x.termino);
    // "Árbol" va antes que "Bucle" aunque empiece con acento.
    expect(orden).toEqual(["Árbol", "Bucle", "Variable"]);
  });

  it("no modifica el arreglo que recibe", () => {
    const original = [t("Variable"), t("Árbol")];
    ordenarTerminos(original);
    expect(original.map((x) => x.termino)).toEqual(["Variable", "Árbol"]);
  });
});

describe("agruparPorLetra", () => {
  it("agrupa por la letra inicial, en orden", () => {
    const grupos = agruparPorLetra([t("Variable"), t("Algoritmo"), t("Bucle"), t("Array")]);

    expect(grupos.map((g) => g.letra)).toEqual(["A", "B", "V"]);
    expect(grupos[0].terminos.map((x) => x.termino)).toEqual(["Algoritmo", "Array"]);
  });

  it("un término con acento va en la letra sin acento", () => {
    // "Árbol" se busca en la A, no en un grupo aparte.
    const grupos = agruparPorLetra([t("Árbol")]);
    expect(grupos.map((g) => g.letra)).toEqual(["A"]);
  });

  it("los términos que empiezan por número caen todos en '#', al final", () => {
    const grupos = agruparPorLetra([t("3D"), t("Algoritmo"), t("2FA")]);

    expect(grupos.map((g) => g.letra)).toEqual(["A", "#"]);
    expect(grupos[1].terminos.map((x) => x.termino)).toEqual(["2FA", "3D"]);
  });

  it("la Ñ tiene su propio grupo, después de la N", () => {
    const grupos = agruparPorLetra([t("Ñandú"), t("Nodo")]);
    expect(grupos.map((g) => g.letra)).toEqual(["N", "Ñ"]);
  });

  it("con el glosario vacío devuelve ningún grupo", () => {
    expect(agruparPorLetra([])).toEqual([]);
  });
});
