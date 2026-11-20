import { describe, it, expect } from "vitest";
import { porcentajeDeNota, promediarPorcentajes, notaSobreCinco } from "./grades";

describe("porcentajeDeNota (US46)", () => {
  it("convierte la nota a porcentaje sobre el puntaje máximo de la actividad", () => {
    expect(porcentajeDeNota(85, 100)).toBe(85);
    expect(porcentajeDeNota(15, 20)).toBe(75);
  });

  it("no divide por cero cuando la actividad no tiene puntaje", () => {
    expect(porcentajeDeNota(5, 0)).toBe(0);
  });

  it("acota el resultado entre 0 y 100 aunque la nota se pase", () => {
    expect(porcentajeDeNota(120, 100)).toBe(100);
    expect(porcentajeDeNota(-5, 100)).toBe(0);
  });
});

describe("promediarPorcentajes (US46)", () => {
  it("promedia y redondea", () => {
    expect(promediarPorcentajes([80, 90, 85])).toBe(85);
    expect(promediarPorcentajes([70, 75])).toBe(73);
  });

  it("devuelve null sin calificaciones, para no mostrar un 0% inventado", () => {
    expect(promediarPorcentajes([])).toBeNull();
  });
});

describe("notaSobreCinco (US46)", () => {
  it("pasa el porcentaje a la escala 1.0 - 5.0 con un decimal", () => {
    expect(notaSobreCinco(100)).toBe("5.0");
    expect(notaSobreCinco(85)).toBe("4.3");
    expect(notaSobreCinco(60)).toBe("3.0");
  });
});
