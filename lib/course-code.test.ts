import { describe, it, expect } from "vitest";
import {
  LARGO_CODIGO_CURSO,
  codigoDelCurso,
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
});
