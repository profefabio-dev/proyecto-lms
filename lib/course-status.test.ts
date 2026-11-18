import { describe, it, expect } from "vitest";
import { obtenerEstadoEstudiante } from "./course-status";

describe("obtenerEstadoEstudiante (US14)", () => {
  it("mapea PUBLICADO a Activo", () => {
    expect(obtenerEstadoEstudiante("PUBLICADO")).toEqual({
      label: "Activo",
      className: "bg-success-soft text-success",
    });
  });

  it("mapea ARCHIVADO a Finalizado", () => {
    expect(obtenerEstadoEstudiante("ARCHIVADO")).toEqual({
      label: "Finalizado",
      className: "bg-muted text-muted-foreground",
    });
  });

  it("mapea BORRADOR a su propia etiqueta (caso de borde, no debería verlo un estudiante)", () => {
    expect(obtenerEstadoEstudiante("BORRADOR")).toEqual({
      label: "Borrador",
      className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
    });
  });
});
