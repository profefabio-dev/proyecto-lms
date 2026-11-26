import { describe, it, expect } from "vitest";
import {
  LARGO_CODIGO_CURSO,
  codigoDelCurso,
  cursosQueCoinciden,
  esFormaDeCodigo,
  filtroPorCodigoCurso,
  formatearCodigoCurso,
  normalizarCodigoCurso,
} from "./course-code";

describe("US51 — Código de clase / clave de inscripción", () => {
  describe("formatearCodigoCurso", () => {
    it("genera el formato XXXX-XXXX a partir de un UUID", () => {
      const courseId = "c8e14b2d-1234-5678-90ab-cdef12345678";
      expect(formatearCodigoCurso(courseId)).toBe("C8E1-4B2D");
    });

    it("convierte a mayúsculas correctamente", () => {
      const courseId = "a1b2c3d4";
      expect(formatearCodigoCurso(courseId)).toBe("A1B2-C3D4");
    });

    it("maneja strings más cortos sin fallar", () => {
      expect(formatearCodigoCurso("abc")).toBe("ABC");
    });
  });

  describe("normalizarCodigoCurso", () => {
    it("elimina guiones y convierte a minúsculas", () => {
      expect(normalizarCodigoCurso("C8E1-4B2D")).toBe("c8e14b2d");
    });

    it("ignora espacios y caracteres especiales", () => {
      expect(normalizarCodigoCurso(" c8e1 - 4b2d! ")).toBe("c8e14b2d");
    });

    it("soporta códigos ingresados directamente en minúsculas sin guión", () => {
      expect(normalizarCodigoCurso("c8e14b2d")).toBe("c8e14b2d");
    });
  });

  // 26/11/2026: `codigoDelCurso` existe para que la comparación del código
  // viva en un solo sitio y esté probada — antes era un `startsWith` de
  // cuatro caracteres escrito dentro de la acción.
  describe("codigoDelCurso", () => {
    it("devuelve el código normalizado del curso", () => {
      expect(codigoDelCurso("c8e14b2d-1234-5678-90ab-cdef12345678")).toBe("c8e14b2d");
    });

    it("coincide con normalizar lo que se le muestra al docente", () => {
      const courseId = "c8e14b2d-1234-5678-90ab-cdef12345678";
      expect(codigoDelCurso(courseId)).toBe(normalizarCodigoCurso(formatearCodigoCurso(courseId)));
    });

    it("distingue dos cursos que solo difieren en el octavo carácter", () => {
      // Es justo el caso que el prefijo de cuatro no distinguía.
      expect(codigoDelCurso("a1b2c3d4-0000-0000-0000-000000000000")).not.toBe(
        codigoDelCurso("a1b2c3d5-0000-0000-0000-000000000000")
      );
    });

    it("el largo del código es el que exige la acción", () => {
      expect(codigoDelCurso("c8e14b2d-1234-5678-90ab-cdef12345678")).toHaveLength(
        LARGO_CODIGO_CURSO
      );
    });
  });

  // 26/11/2026: los dos ayudantes que comparten la acción de inscribirse y
  // el buscador del campus, para que la regla del código viva en un solo
  // sitio.
  describe("esFormaDeCodigo", () => {
    it("acepta un código con guion, sin guion y en minúsculas", () => {
      expect(esFormaDeCodigo("C8E1-4B2D")).toBe(true);
      expect(esFormaDeCodigo("c8e14b2d")).toBe(true);
      expect(esFormaDeCodigo(" c8e1 4b2d ")).toBe(true);
    });

    it("rechaza un término de búsqueda normal", () => {
      // Es lo que evita una consulta de más por cada búsqueda del campus.
      expect(esFormaDeCodigo("robótica")).toBe(false);
      expect(esFormaDeCodigo("html")).toBe(false);
      expect(esFormaDeCodigo("base de datos")).toBe(false);
    });

    it("rechaza un código incompleto o demasiado largo", () => {
      expect(esFormaDeCodigo("C8E1")).toBe(false);
      expect(esFormaDeCodigo("C8E1-4B2D5")).toBe(false);
    });
  });

  describe("filtroPorCodigoCurso", () => {
    it("filtra por el comienzo del id, sin distinguir mayúsculas", () => {
      expect(filtroPorCodigoCurso("c8e14b2d")).toEqual({
        startsWith: "c8e14b2d",
        mode: "insensitive",
      });
    });
  });

  describe("cursosQueCoinciden", () => {
    const uno = { id: "c8e14b2d-1111-2222-3333-444455556666" };
    const otro = { id: "c8e14b2e-1111-2222-3333-444455556666" };

    it("devuelve solo el curso cuyo código es exacto", () => {
      expect(cursosQueCoinciden([uno, otro], "c8e14b2d")).toEqual([uno]);
    });

    it("devuelve vacío si ninguno coincide", () => {
      expect(cursosQueCoinciden([otro], "c8e14b2d")).toEqual([]);
    });

    it("devuelve los dos si coincidieran, para que quien llama lo note", () => {
      // La acción rechaza el código en ese caso en vez de elegir uno.
      const gemelo = { id: "c8e14b2d-9999-8888-7777-666655554444" };
      expect(cursosQueCoinciden([uno, gemelo], "c8e14b2d")).toHaveLength(2);
    });
  });
});
