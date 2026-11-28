/**
 * US57 — los términos que acepta un docente al compartir (28/11/2026).
 */
import { describe, it, expect } from "vitest";
import {
  PUNTOS_LICENCIA,
  RESUMEN_LICENCIA,
  VERSION_LICENCIA,
  faltaLicencia,
  licenciaAlDia,
} from "./licencia-compartir";

describe("el texto de la licencia", () => {
  it("tiene versión, y la versión es la fecha en que se escribió", () => {
    // Sin versión, "aceptó los términos" no dice qué aceptó.
    expect(VERSION_LICENCIA).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("pide permiso, no renuncia", () => {
    // Los derechos morales son irrenunciables: el texto autoriza a otros a
    // usar el material, no le pide al autor que deje de serlo.
    expect(RESUMEN_LICENCIA.toLowerCase()).toContain("autorizo");
    const todo = PUNTOS_LICENCIA.join(" ").toLowerCase();
    expect(todo).not.toContain("renuncia");
    expect(todo).not.toContain("cede");
  });

  it("promete el crédito al autor, que es la contrapartida", () => {
    expect(PUNTOS_LICENCIA.join(" ").toLowerCase()).toContain("sigues siendo el autor");
  });

  it("dice que se puede dejar de compartir y qué pasa con las copias hechas", () => {
    const todo = PUNTOS_LICENCIA.join(" ").toLowerCase();
    expect(todo).toContain("dejar de compartirlo");
    expect(todo).toContain("copias nuevas");
  });
});

describe("faltaLicencia", () => {
  it("marca un curso compartido sin aceptación registrada", () => {
    // Es el caso de lo que se compartió antes de que la casilla existiera:
    // la migración no inventa un consentimiento.
    expect(faltaLicencia({ compartible: true, licenciaAceptadaEn: null })).toBe(true);
  });

  it("no marca uno compartido con aceptación", () => {
    expect(faltaLicencia({ compartible: true, licenciaAceptadaEn: new Date() })).toBe(false);
  });

  it("no marca un curso que no está compartido", () => {
    // Sin compartir no hace falta permiso de nada.
    expect(faltaLicencia({ compartible: false, licenciaAceptadaEn: null })).toBe(false);
  });
});

describe("licenciaAlDia", () => {
  it("reconoce la versión vigente", () => {
    expect(licenciaAlDia({ licenciaVersion: VERSION_LICENCIA })).toBe(true);
  });

  it("marca como vieja una versión anterior y la ausencia de versión", () => {
    expect(licenciaAlDia({ licenciaVersion: "2020-01-01" })).toBe(false);
    expect(licenciaAlDia({ licenciaVersion: null })).toBe(false);
  });
});
