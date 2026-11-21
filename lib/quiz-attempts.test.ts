import { describe, it, expect } from "vitest";
import { intentosRestantes, puedeIntentar } from "./quiz-attempts";

describe("intentosRestantes (OP08)", () => {
  it("resta los intentos ya usados", () => {
    expect(intentosRestantes(3, 1)).toBe(2);
    expect(intentosRestantes(3, 3)).toBe(0);
  });

  it("nunca devuelve un número negativo, aunque haya más intentos que el tope", () => {
    // Puede pasar si el Tutor baja el límite después de que alguien ya
    // respondió varias veces: no debe mostrarse "-2 intentos".
    expect(intentosRestantes(2, 5)).toBe(0);
  });

  it("sin límite devuelve Infinity, no un número grande arbitrario", () => {
    expect(intentosRestantes(null, 10)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("puedeIntentar (OP08)", () => {
  it("deja responder mientras queden intentos", () => {
    expect(puedeIntentar(3, 0)).toBe(true);
    expect(puedeIntentar(3, 2)).toBe(true);
  });

  it("bloquea al agotarlos", () => {
    expect(puedeIntentar(3, 3)).toBe(false);
    expect(puedeIntentar(1, 1)).toBe(false);
  });

  it("sin límite siempre deja responder", () => {
    expect(puedeIntentar(null, 99)).toBe(true);
  });
});
