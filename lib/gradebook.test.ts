import { describe, it, expect } from "vitest";
import { celdaDeActividad, celdaDeQuiz, construirPlanilla } from "./gradebook";

describe("celdaDeActividad (22/11/2026)", () => {
  it("sin entrega devuelve sin_entregar", () => {
    expect(celdaDeActividad(undefined, 100)).toEqual({ estado: "sin_entregar" });
  });

  it("entregada sin nota devuelve sin_calificar, no cero", () => {
    expect(
      celdaDeActividad({ actividadId: "a1", userId: "u1", nota: null }, 100)
    ).toEqual({ estado: "sin_calificar" });
  });

  it("normaliza la nota al puntaje maximo de esa actividad", () => {
    // 4 sobre 5 es lo mismo que 80 sobre 100: sin normalizar, promediar
    // una actividad sobre 5 con una sobre 100 no significaria nada.
    expect(celdaDeActividad({ actividadId: "a1", userId: "u1", nota: 4 }, 5)).toEqual({
      estado: "calificada",
      porcentaje: 80,
    });
  });
});

describe("celdaDeQuiz (22/11/2026)", () => {
  it("sin intentos devuelve sin_entregar", () => {
    expect(celdaDeQuiz([])).toEqual({ estado: "sin_entregar" });
  });

  it("toma el mejor intento, no el ultimo", () => {
    expect(
      celdaDeQuiz([
        { quizId: "q1", userId: "u1", puntaje: 50 },
        { quizId: "q1", userId: "u1", puntaje: 90 },
        { quizId: "q1", userId: "u1", puntaje: 70 },
      ])
    ).toEqual({ estado: "calificada", porcentaje: 90 });
  });
});

describe("construirPlanilla (22/11/2026)", () => {
  const actividades = [
    { id: "a1", titulo: "Taller 1", puntajeMaximo: 100 },
    { id: "a2", titulo: "Taller 2", puntajeMaximo: 50 },
  ];
  const quizzes = [{ id: "q1", titulo: "Repaso" }];

  it("pone las actividades primero y despues las evaluaciones", () => {
    const { columnas } = construirPlanilla({
      estudiantes: [{ id: "u1" }],
      actividades,
      quizzes,
      entregas: [],
      intentos: [],
    });

    expect(columnas.map((c) => [c.id, c.tipo])).toEqual([
      ["a1", "ACTIVIDAD"],
      ["a2", "ACTIVIDAD"],
      ["q1", "EVALUACION"],
    ]);
  });

  it("arma una celda por columna y cuenta lo que falta por entregar", () => {
    const { filas } = construirPlanilla({
      estudiantes: [{ id: "u1" }],
      actividades,
      quizzes,
      entregas: [{ actividadId: "a1", userId: "u1", nota: 80 }],
      intentos: [{ quizId: "q1", userId: "u1", puntaje: 60 }],
    });

    expect(filas[0].celdas).toEqual([
      { estado: "calificada", porcentaje: 80 },
      { estado: "sin_entregar" },
      { estado: "calificada", porcentaje: 60 },
    ]);
    expect(filas[0].sinEntregar).toBe(1);
    // Promedia solo lo calificado: (80 + 60) / 2.
    expect(filas[0].promedio).toBe(70);
  });

  it("no mezcla las entregas de un estudiante con las de otro", () => {
    const { filas } = construirPlanilla({
      estudiantes: [{ id: "u1" }, { id: "u2" }],
      actividades: [actividades[0]],
      quizzes: [],
      entregas: [{ actividadId: "a1", userId: "u2", nota: 90 }],
      intentos: [],
    });

    expect(filas[0].celdas).toEqual([{ estado: "sin_entregar" }]);
    expect(filas[1].celdas).toEqual([{ estado: "calificada", porcentaje: 90 }]);
  });

  it("sin nada calificado el promedio es null, no cero", () => {
    const { filas } = construirPlanilla({
      estudiantes: [{ id: "u1" }],
      actividades,
      quizzes,
      entregas: [{ actividadId: "a1", userId: "u1", nota: null }],
      intentos: [],
    });

    expect(filas[0].promedio).toBeNull();
  });
});
