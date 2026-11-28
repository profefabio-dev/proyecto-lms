/**
 * US56-A — el modo de lectura (28/11/2026).
 */
import { describe, it, expect } from "vitest";
import {
  MODOS_DE_LECTURA,
  MODO_LECTURA_POR_OMISION,
  claseDeLaHoja,
  esModoLectura,
  leerModoLectura,
  modoOpuesto,
} from "./reading-mode";

describe("leerModoLectura", () => {
  it("acepta los dos modos", () => {
    expect(leerModoLectura("oscuro")).toBe("oscuro");
    expect(leerModoLectura("claro")).toBe("claro");
  });

  it("cae en el modo de la plataforma si la cookie no está o es ilegible", () => {
    // Una cookie la escribe el navegador: puede venir vacía, con basura o no
    // venir. Ninguno de esos casos debe romper una lección.
    expect(leerModoLectura(undefined)).toBe(MODO_LECTURA_POR_OMISION);
    expect(leerModoLectura(null)).toBe(MODO_LECTURA_POR_OMISION);
    expect(leerModoLectura("")).toBe(MODO_LECTURA_POR_OMISION);
    expect(leerModoLectura("CLARO")).toBe(MODO_LECTURA_POR_OMISION);
    expect(leerModoLectura("<script>")).toBe(MODO_LECTURA_POR_OMISION);
    expect(leerModoLectura(7)).toBe(MODO_LECTURA_POR_OMISION);
  });

  it("el modo por omisión es el de la plataforma (OP09), no el claro", () => {
    // La lección no cambia de aspecto por sí sola: quien nunca tocó el
    // interruptor ve lo mismo que el resto de la plataforma.
    expect(MODO_LECTURA_POR_OMISION).toBe("oscuro");
  });
});

describe("esModoLectura", () => {
  it("reconoce exactamente los modos declarados", () => {
    for (const modo of MODOS_DE_LECTURA) {
      expect(esModoLectura(modo)).toBe(true);
    }
    expect(esModoLectura("sepia")).toBe(false);
    expect(esModoLectura(undefined)).toBe(false);
  });
});

describe("modoOpuesto", () => {
  it("alterna, y dos veces vuelve al punto de partida", () => {
    expect(modoOpuesto("oscuro")).toBe("claro");
    expect(modoOpuesto("claro")).toBe("oscuro");
    for (const modo of MODOS_DE_LECTURA) {
      expect(modoOpuesto(modoOpuesto(modo))).toBe(modo);
    }
  });
});

describe("claseDeLaHoja", () => {
  it("solo el modo claro agrega una clase", () => {
    // En oscuro no se agrega nada: la lección hereda los tokens de la
    // plataforma. Si esto devolviera una clase "hoja-oscura", habría dos
    // definiciones del mismo tema y una se iría quedando atrás.
    expect(claseDeLaHoja("claro")).toBe("hoja-clara");
    expect(claseDeLaHoja("oscuro")).toBeUndefined();
  });
});
