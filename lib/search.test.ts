import { describe, it, expect } from "vitest";
import { construirFiltroBusqueda } from "./search";

describe("construirFiltroBusqueda (US17)", () => {
  it("busca coincidencias en titulo o descripcion, sin distinguir mayusculas", () => {
    expect(construirFiltroBusqueda("html")).toEqual({
      OR: [
        { titulo: { contains: "html", mode: "insensitive" } },
        { descripcion: { contains: "html", mode: "insensitive" } },
      ],
    });
  });

  it("no recorta ni cambia el termino de busqueda", () => {
    expect(construirFiltroBusqueda("CSS Avanzado")).toEqual({
      OR: [
        { titulo: { contains: "CSS Avanzado", mode: "insensitive" } },
        { descripcion: { contains: "CSS Avanzado", mode: "insensitive" } },
      ],
    });
  });
});
