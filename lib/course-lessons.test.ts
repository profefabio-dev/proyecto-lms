import { describe, it, expect } from "vitest";
import {
  filtrarContenidosAccesibles,
  ordenarLecciones,
  ubicarLeccion,
  siguienteLeccionPendiente,
} from "./course-lessons";

describe("filtrarContenidosAccesibles (US30/US43)", () => {
  it("descarta el contenido invisible", () => {
    const contenidos = [
      { id: "c1", visible: true, seccionId: null },
      { id: "c2", visible: false, seccionId: null },
    ];

    expect(filtrarContenidosAccesibles(contenidos, [])).toEqual([
      { id: "c1", visible: true, seccionId: null },
    ]);
  });

  it("descarta el contenido de una sección No disponible", () => {
    const secciones = [
      { id: "sec-1", estado: "DISPONIBLE" },
      { id: "sec-2", estado: "NO_DISPONIBLE" },
    ];
    const contenidos = [
      { id: "c1", visible: true, seccionId: "sec-1" },
      { id: "c2", visible: true, seccionId: "sec-2" },
    ];

    expect(filtrarContenidosAccesibles(contenidos, secciones).map((c) => c.id)).toEqual(["c1"]);
  });

  it("nunca esconde el contenido sin sección, haya las secciones que haya", () => {
    const secciones = [{ id: "sec-1", estado: "NO_DISPONIBLE" }];
    const contenidos = [{ id: "c1", visible: true, seccionId: null }];

    expect(filtrarContenidosAccesibles(contenidos, secciones).map((c) => c.id)).toEqual(["c1"]);
  });
});

describe("ordenarLecciones (US43)", () => {
  it("recorre sección por sección y deja el contenido suelto al final", () => {
    const secciones = [{ id: "sec-1" }, { id: "sec-2" }];
    const contenidos = [
      { id: "suelto", seccionId: null },
      { id: "c1", seccionId: "sec-1" },
      { id: "c2", seccionId: "sec-2" },
      { id: "c3", seccionId: "sec-1" },
    ];

    expect(ordenarLecciones(contenidos, secciones).map((c) => c.id)).toEqual([
      "c1",
      "c3",
      "c2",
      "suelto",
    ]);
  });

  it("devuelve solo el contenido suelto cuando el curso no usa secciones", () => {
    const contenidos = [
      { id: "c1", seccionId: null },
      { id: "c2", seccionId: null },
    ];

    expect(ordenarLecciones(contenidos, []).map((c) => c.id)).toEqual(["c1", "c2"]);
  });
});

describe("ubicarLeccion (US43)", () => {
  const lecciones = [{ id: "c1" }, { id: "c2" }, { id: "c3" }];

  it("devuelve la lección anterior y la siguiente en el medio de la secuencia", () => {
    expect(ubicarLeccion(lecciones, "c2")).toEqual({
      indice: 1,
      actual: { id: "c2" },
      anterior: { id: "c1" },
      siguiente: { id: "c3" },
    });
  });

  it("no inventa una anterior en la primera ni una siguiente en la última", () => {
    expect(ubicarLeccion(lecciones, "c1").anterior).toBeNull();
    expect(ubicarLeccion(lecciones, "c3").siguiente).toBeNull();
  });

  it("marca indice -1 si el id no está en la secuencia, para responder 404", () => {
    expect(ubicarLeccion(lecciones, "no-existe")).toEqual({
      indice: -1,
      actual: null,
      anterior: null,
      siguiente: null,
    });
  });
});

describe("siguienteLeccionPendiente (US43)", () => {
  const lecciones = [{ id: "c1" }, { id: "c2" }, { id: "c3" }];

  it("devuelve la primera lección sin completar", () => {
    expect(siguienteLeccionPendiente(lecciones, new Set(["c1"]))).toEqual({ id: "c2" });
  });

  it("devuelve la primera lección cuando el curso ya está completo, para poder repasar", () => {
    expect(siguienteLeccionPendiente(lecciones, new Set(["c1", "c2", "c3"]))).toEqual({ id: "c1" });
  });

  it("devuelve null si no hay lecciones accesibles", () => {
    expect(siguienteLeccionPendiente([], new Set<string>())).toBeNull();
  });
});
