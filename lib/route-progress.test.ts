import { describe, it, expect } from "vitest";
import { calcularAvanceDeRuta, siguienteCursoDeRuta } from "./route-progress";

describe("calcularAvanceDeRuta (US44)", () => {
  it("pondera por lecciones, no por cursos", () => {
    // 20 lecciones vistas de 22: terminar el curso grande vale mucho más
    // que terminar el chico, que es justo lo que se quiere.
    const avance = calcularAvanceDeRuta([
      { courseId: "c1", total: 20, vistas: 20 },
      { courseId: "c2", total: 2, vistas: 0 },
    ]);

    expect(avance.progreso).toBe(91);
    expect(avance.leccionesVistas).toBe(20);
    expect(avance.leccionesTotales).toBe(22);
    expect(avance.cursosCompletados).toBe(1);
  });

  it("no cuenta como completado un curso sin lecciones publicadas", () => {
    const avance = calcularAvanceDeRuta([
      { courseId: "c1", total: 0, vistas: 0 },
      { courseId: "c2", total: 4, vistas: 2 },
    ]);

    expect(avance.cursosCompletados).toBe(0);
    expect(avance.cursosConContenido).toBe(1);
    expect(avance.progreso).toBe(50);
  });

  it("devuelve 0% en una ruta vacía, sin dividir por cero", () => {
    expect(calcularAvanceDeRuta([])).toEqual({
      progreso: 0,
      leccionesVistas: 0,
      leccionesTotales: 0,
      cursosCompletados: 0,
      cursosConContenido: 0,
    });
  });

  it("llega a 100% cuando se vieron todas las lecciones de la ruta", () => {
    const avance = calcularAvanceDeRuta([
      { courseId: "c1", total: 3, vistas: 3 },
      { courseId: "c2", total: 1, vistas: 1 },
    ]);

    expect(avance.progreso).toBe(100);
    expect(avance.cursosCompletados).toBe(2);
  });
});

describe("siguienteCursoDeRuta (US44)", () => {
  it("devuelve el primer curso incompleto, en el orden de la ruta", () => {
    const siguiente = siguienteCursoDeRuta([
      { courseId: "c1", total: 2, vistas: 2 },
      { courseId: "c2", total: 2, vistas: 1 },
      { courseId: "c3", total: 2, vistas: 0 },
    ]);

    expect(siguiente?.courseId).toBe("c2");
  });

  it("se salta los cursos vacíos", () => {
    const siguiente = siguienteCursoDeRuta([
      { courseId: "c1", total: 0, vistas: 0 },
      { courseId: "c2", total: 1, vistas: 0 },
    ]);

    expect(siguiente?.courseId).toBe("c2");
  });

  it("devuelve null cuando la ruta ya está completa", () => {
    expect(siguienteCursoDeRuta([{ courseId: "c1", total: 1, vistas: 1 }])).toBeNull();
  });
});
