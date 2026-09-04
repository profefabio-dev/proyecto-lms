import { describe, it, expect } from "vitest";
import { calcularRacha } from "./streak";

const HOY = new Date("2026-09-04T10:00:00");

function haceDias(n: number, horas = 12): Date {
  const fecha = new Date(HOY);
  fecha.setDate(fecha.getDate() - n);
  fecha.setHours(horas, 0, 0, 0);
  return fecha;
}

describe("calcularRacha", () => {
  it("devuelve 0 sin ninguna vista", () => {
    expect(calcularRacha([], HOY)).toBe(0);
  });

  it("devuelve 0 si la última vista fue hace 2 días o más", () => {
    expect(calcularRacha([haceDias(2)], HOY)).toBe(0);
  });

  it("cuenta 1 con una sola vista hoy", () => {
    expect(calcularRacha([haceDias(0)], HOY)).toBe(1);
  });

  it("da un día de gracia: cuenta la racha si ayer hubo actividad aunque hoy no", () => {
    expect(calcularRacha([haceDias(1)], HOY)).toBe(1);
  });

  it("cuenta días consecutivos hacia atrás sin cortarse", () => {
    const vistas = [haceDias(0), haceDias(1), haceDias(2), haceDias(3)];
    expect(calcularRacha(vistas, HOY)).toBe(4);
  });

  it("se corta al primer hueco", () => {
    const vistas = [haceDias(0), haceDias(1), haceDias(3)];
    expect(calcularRacha(vistas, HOY)).toBe(2);
  });

  it("ignora vistas repetidas el mismo día", () => {
    const vistas = [haceDias(0, 8), haceDias(0, 20), haceDias(1, 9)];
    expect(calcularRacha(vistas, HOY)).toBe(2);
  });

  it("no depende del orden de las fechas", () => {
    const vistas = [haceDias(3), haceDias(0), haceDias(2), haceDias(1)];
    expect(calcularRacha(vistas, HOY)).toBe(4);
  });
});
