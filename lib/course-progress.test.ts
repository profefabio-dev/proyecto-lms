import { describe, it, expect } from "vitest";
import { calcularProgreso } from "./course-progress";

describe("calcularProgreso (US19)", () => {
  it("devuelve 0 cuando el curso no tiene contenidos visibles", () => {
    expect(calcularProgreso(0, 0)).toBe(0);
  });

  it("devuelve 0 cuando no se ha visto ningun contenido", () => {
    expect(calcularProgreso(0, 5)).toBe(0);
  });

  it("devuelve 100 cuando se vieron todos los contenidos", () => {
    expect(calcularProgreso(5, 5)).toBe(100);
  });

  it("redondea el porcentaje al entero mas cercano", () => {
    expect(calcularProgreso(1, 3)).toBe(33);
    expect(calcularProgreso(2, 3)).toBe(67);
  });
});
