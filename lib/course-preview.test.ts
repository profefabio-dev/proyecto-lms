/**
 * US42 — quién entra a la pantalla del curso del Estudiante (25/11/2026).
 *
 * Esta función amplía un control de acceso, así que lo que más importa de
 * estas pruebas es el **lado negativo**: que seguir siendo un estudiante no
 * inscrito, o un tutor que no es el dueño, no alcance para entrar.
 */
import { describe, it, expect } from "vitest";
import { accesoAlCurso, esVistaPrevia } from "./course-preview";

const CURSO_DE = "tutor-1";

describe("accesoAlCurso (US42)", () => {
  it("un estudiante inscrito entra a la pantalla completa", () => {
    expect(
      accesoAlCurso({
        rol: "ESTUDIANTE",
        usuarioId: "est-1",
        tutorIdDelCurso: CURSO_DE,
        tieneInscripcion: true,
      })
    ).toEqual({ modo: "estudiante" });
  });

  it("un estudiante SIN inscripción no entra", () => {
    // La guarda de US11/US15 no cambia por esta historia.
    expect(
      accesoAlCurso({
        rol: "ESTUDIANTE",
        usuarioId: "est-1",
        tutorIdDelCurso: CURSO_DE,
        tieneInscripcion: false,
      })
    ).toEqual({ modo: "denegado" });
  });

  it("el tutor dueño entra en vista previa", () => {
    const acceso = accesoAlCurso({
      rol: "TUTOR",
      usuarioId: CURSO_DE,
      tutorIdDelCurso: CURSO_DE,
      tieneInscripcion: false,
    });

    expect(acceso).toEqual({ modo: "vista_previa" });
    expect(esVistaPrevia(acceso)).toBe(true);
  });

  it("un tutor que NO es el dueño no entra, aunque conozca el id", () => {
    expect(
      accesoAlCurso({
        rol: "TUTOR",
        usuarioId: "otro-tutor",
        tutorIdDelCurso: CURSO_DE,
        tieneInscripcion: false,
      })
    ).toEqual({ modo: "denegado" });
  });

  it("un tutor ajeno no entra ni teniendo una inscripción en el curso", () => {
    // Caso de borde, pero conviene fijarlo: la inscripción solo habilita a
    // un estudiante. Que un tutor apareciera inscrito no lo convierte en
    // dueño de la pantalla.
    expect(
      accesoAlCurso({
        rol: "TUTOR",
        usuarioId: "otro-tutor",
        tutorIdDelCurso: CURSO_DE,
        tieneInscripcion: true,
      })
    ).toEqual({ modo: "denegado" });
  });

  it("un Administrador no entra", () => {
    expect(
      accesoAlCurso({
        rol: "ADMINISTRADOR",
        usuarioId: "adm-1",
        tutorIdDelCurso: CURSO_DE,
        tieneInscripcion: false,
      })
    ).toEqual({ modo: "denegado" });
  });

  it("un Super Administrador tampoco", () => {
    expect(
      accesoAlCurso({
        rol: "SUPERADMIN",
        usuarioId: "sa-1",
        tutorIdDelCurso: CURSO_DE,
        tieneInscripcion: true,
      })
    ).toEqual({ modo: "denegado" });
  });

  it("esVistaPrevia es falso para un estudiante de verdad", () => {
    expect(esVistaPrevia({ modo: "estudiante" })).toBe(false);
    expect(esVistaPrevia({ modo: "denegado" })).toBe(false);
  });
});
