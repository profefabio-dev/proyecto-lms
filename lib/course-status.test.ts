import { describe, it, expect } from "vitest";
import { obtenerEstadoEstudiante } from "./course-status";

describe("obtenerEstadoEstudiante (US14)", () => {
  it("mapea PUBLICADO a Activo", () => {
    expect(obtenerEstadoEstudiante("PUBLICADO")).toEqual({
      label: "Activo",
      className: "bg-green-100 text-green-800",
    });
  });

  it("mapea ARCHIVADO a Finalizado", () => {
    expect(obtenerEstadoEstudiante("ARCHIVADO")).toEqual({
      label: "Finalizado",
      className: "bg-gray-200 text-gray-700",
    });
  });

  it("mapea BORRADOR a su propia etiqueta (caso de borde, no debería verlo un estudiante)", () => {
    expect(obtenerEstadoEstudiante("BORRADOR")).toEqual({
      label: "Borrador",
      className: "bg-yellow-100 text-yellow-800",
    });
  });
});
