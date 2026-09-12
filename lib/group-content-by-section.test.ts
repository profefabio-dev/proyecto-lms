import { describe, it, expect } from "vitest";
import { agruparContenidoPorSeccion, contenidoSinSeccion } from "./group-content-by-section";

describe("agruparContenidoPorSeccion (US30)", () => {
  it("agrupa cada contenido bajo su sección, respetando el orden de las secciones", () => {
    const secciones = [{ id: "sec-1" }, { id: "sec-2" }];
    const contenidos = [
      { id: "c1", seccionId: "sec-2" },
      { id: "c2", seccionId: "sec-1" },
      { id: "c3", seccionId: "sec-1" },
    ];

    const grupos = agruparContenidoPorSeccion(contenidos, secciones);

    expect(grupos).toEqual([
      { seccion: { id: "sec-1" }, contenidos: [{ id: "c2", seccionId: "sec-1" }, { id: "c3", seccionId: "sec-1" }] },
      { seccion: { id: "sec-2" }, contenidos: [{ id: "c1", seccionId: "sec-2" }] },
    ]);
  });

  it("deja un grupo vacío si la sección todavía no tiene contenido", () => {
    const secciones = [{ id: "sec-1" }];
    const contenidos: { id: string; seccionId: string | null }[] = [];

    const grupos = agruparContenidoPorSeccion(contenidos, secciones);

    expect(grupos).toEqual([{ seccion: { id: "sec-1" }, contenidos: [] }]);
  });

  it("no incluye contenido sin sección en ningún grupo", () => {
    const secciones = [{ id: "sec-1" }];
    const contenidos = [
      { id: "c1", seccionId: "sec-1" },
      { id: "c2", seccionId: null },
    ];

    const grupos = agruparContenidoPorSeccion(contenidos, secciones);

    expect(grupos[0].contenidos).toEqual([{ id: "c1", seccionId: "sec-1" }]);
  });
});

describe("contenidoSinSeccion (US30)", () => {
  it("devuelve solo el contenido sin sección asignada", () => {
    const contenidos = [
      { id: "c1", seccionId: "sec-1" },
      { id: "c2", seccionId: null },
      { id: "c3", seccionId: null },
    ];

    expect(contenidoSinSeccion(contenidos)).toEqual([
      { id: "c2", seccionId: null },
      { id: "c3", seccionId: null },
    ]);
  });

  it("devuelve un arreglo vacío si todo el contenido tiene sección", () => {
    const contenidos = [{ id: "c1", seccionId: "sec-1" }];

    expect(contenidoSinSeccion(contenidos)).toEqual([]);
  });

  it("devuelve un arreglo vacío para un curso sin contenido", () => {
    expect(contenidoSinSeccion([])).toEqual([]);
  });
});
