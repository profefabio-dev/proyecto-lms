import { describe, it, expect } from "vitest";
import {
  faltaParaCompartir,
  mensajeDeRequisitos,
  puedeCompartirse,
  type CursoParaCompartir,
} from "./course-shareable";

function curso(extra: Partial<CursoParaCompartir> = {}): CursoParaCompartir {
  return {
    descripcion:
      "Un curso completo sobre los fundamentos de la informática, pensado para estudiantes de bachillerato.",
    imagen: "https://ejemplo/portada.jpg",
    leccionesVisibles: 6,
    actividadesVisibles: 1,
    evaluacionesVisibles: 1,
    ...extra,
  };
}

describe("faltaParaCompartir (US49)", () => {
  it("un curso completo no tiene nada pendiente", () => {
    expect(faltaParaCompartir(curso())).toEqual([]);
    expect(puedeCompartirse(curso())).toBe(true);
  });

  it("exige un mínimo de lecciones y dice cuántas faltan", () => {
    expect(faltaParaCompartir(curso({ leccionesVisibles: 2 }))).toContain(
      "una lección más publicada"
    );
    expect(faltaParaCompartir(curso({ leccionesVisibles: 1 }))).toContain(
      "2 lecciones más publicadas"
    );
  });

  it("no cuenta las lecciones ocultas: quien adopte el curso no las vería", () => {
    // El dato que entra ya son solo las visibles; esto fija que con cero
    // visibles el curso no se puede compartir aunque tenga material oculto.
    expect(puedeCompartirse(curso({ leccionesVisibles: 0 }))).toBe(false);
  });

  it("basta con una actividad O una evaluación, no las dos", () => {
    expect(puedeCompartirse(curso({ actividadesVisibles: 0 }))).toBe(true);
    expect(puedeCompartirse(curso({ evaluacionesVisibles: 0 }))).toBe(true);
    expect(
      faltaParaCompartir(curso({ actividadesVisibles: 0, evaluacionesVisibles: 0 }))
    ).toContain("una actividad o una evaluación publicada");
  });

  it("rechaza una descripción demasiado corta", () => {
    const falta = faltaParaCompartir(curso({ descripcion: "Curso de informática" }));
    expect(falta.some((f) => f.includes("descripción"))).toBe(true);
  });

  it("no acepta una descripción de puros espacios", () => {
    expect(puedeCompartirse(curso({ descripcion: "   ".repeat(40) }))).toBe(false);
  });

  it("exige portada", () => {
    expect(faltaParaCompartir(curso({ imagen: null }))).toContain("una imagen de portada");
  });

  it("acumula todo lo que falta, no se detiene en lo primero", () => {
    const falta = faltaParaCompartir({
      descripcion: "Corto",
      imagen: null,
      leccionesVisibles: 0,
      actividadesVisibles: 0,
      evaluacionesVisibles: 0,
    });

    expect(falta).toHaveLength(4);
  });
});

describe("mensajeDeRequisitos (US49)", () => {
  it("con todo listo, lo dice", () => {
    expect(mensajeDeRequisitos([])).toBe("Este curso ya se puede compartir con otros docentes.");
  });

  it("con una sola cosa, la frase va en singular", () => {
    expect(mensajeDeRequisitos(["una imagen de portada"])).toBe(
      "Para compartirlo te falta una imagen de portada."
    );
  });

  it("con varias, las enumera y une la última con 'y'", () => {
    expect(mensajeDeRequisitos(["A", "B", "C"])).toBe("Para compartirlo te faltan: A, B y C.");
  });
});
