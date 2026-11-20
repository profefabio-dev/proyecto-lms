import { describe, it, expect } from "vitest";
import { componerCodigo, separarCodigo } from "./code-content";

describe("componerCodigo / separarCodigo (US45)", () => {
  it("guarda el lenguaje en la primera línea y lo recupera igual", () => {
    const guardado = componerCodigo("python", 'print("hola")');

    expect(guardado).toBe('lenguaje: python\nprint("hola")');
    expect(separarCodigo(guardado)).toEqual({ lenguaje: "python", codigo: 'print("hola")' });
  });

  it("sin lenguaje, guarda solo el código", () => {
    const guardado = componerCodigo("   ", "SELECT 1;");

    expect(guardado).toBe("SELECT 1;");
    expect(separarCodigo(guardado)).toEqual({ lenguaje: null, codigo: "SELECT 1;" });
  });

  it("trata como código un texto pegado a mano sin encabezado", () => {
    expect(separarCodigo("function suma(a, b) {\n  return a + b;\n}")).toEqual({
      lenguaje: null,
      codigo: "function suma(a, b) {\n  return a + b;\n}",
    });
  });

  it("conserva los saltos de línea del código, no solo la primera línea", () => {
    const { lenguaje, codigo } = separarCodigo("lenguaje: js\nconst a = 1;\nconst b = 2;");

    expect(lenguaje).toBe("js");
    expect(codigo).toBe("const a = 1;\nconst b = 2;");
  });

  it("un encabezado sin código deja el cuerpo vacío en vez de romperse", () => {
    expect(separarCodigo("lenguaje: java")).toEqual({ lenguaje: "java", codigo: "" });
  });
});
