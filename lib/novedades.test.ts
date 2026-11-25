import { describe, it, expect } from "vitest";
import {
  dentroDeLaVentana,
  diasHasta,
  ordenarNovedades,
  proximosDias,
  textoDePlazo,
  type Novedad,
} from "./novedades";

const AHORA = new Date("2026-11-22T10:00:00");

function material(titulo: string, fecha: Date): Novedad {
  return {
    tipo: "material",
    cursoId: "c1",
    cursoTitulo: "Curso",
    titulo,
    href: "/x",
    fecha,
    clase: "leccion",
  };
}

function plazo(titulo: string, fecha: Date, diasRestantes: number): Novedad {
  return {
    tipo: "plazo",
    cursoId: "c1",
    cursoTitulo: "Curso",
    titulo,
    href: "/x",
    fecha,
    diasRestantes,
  };
}

function anuncio(titulo: string, fecha: Date): Novedad {
  return {
    tipo: "anuncio",
    cursoId: "c1",
    cursoTitulo: "Curso",
    titulo,
    href: "/estudiante/cursos/c1",
    fecha,
    cuerpo: "El cuerpo del anuncio.",
    autor: "Fabio Aguirre",
  };
}

describe("dentroDeLaVentana (22/11/2026)", () => {
  it("acepta algo de hace unos dias", () => {
    expect(dentroDeLaVentana(new Date("2026-11-20T10:00:00"), AHORA)).toBe(true);
  });

  it("rechaza algo anterior a la ventana", () => {
    expect(dentroDeLaVentana(new Date("2026-11-01T10:00:00"), AHORA)).toBe(false);
  });

  it("rechaza una fecha futura: no es una novedad todavia", () => {
    expect(dentroDeLaVentana(new Date("2026-11-25T10:00:00"), AHORA)).toBe(false);
  });
});

describe("diasHasta (22/11/2026)", () => {
  it("cuenta dias de calendario, no fracciones", () => {
    // Vence hoy a las 23:00 y son las 10:00: faltan 0 dias, no 0.5. Es
    // como lo cuenta una persona.
    expect(diasHasta(new Date("2026-11-22T23:00:00"), AHORA)).toBe(0);
  });

  it("manana es 1", () => {
    expect(diasHasta(new Date("2026-11-23T08:00:00"), AHORA)).toBe(1);
  });

  it("un plazo ya pasado da negativo", () => {
    expect(diasHasta(new Date("2026-11-20T08:00:00"), AHORA)).toBe(-2);
  });
});

describe("textoDePlazo (22/11/2026)", () => {
  it("distingue vencido, hoy y manana", () => {
    expect(textoDePlazo(-1)).toBe("Se pasó el plazo");
    expect(textoDePlazo(0)).toBe("Vence hoy");
    expect(textoDePlazo(1)).toBe("Vence mañana");
    expect(textoDePlazo(4)).toBe("Vencen en 4 días");
  });
});

describe("proximosDias (22/11/2026)", () => {
  it("devuelve el tope hacia adelante", () => {
    expect(proximosDias(AHORA, 7).toISOString().slice(0, 10)).toBe("2026-11-29");
  });
});

describe("ordenarNovedades (22/11/2026)", () => {
  it("pone los plazos primero, por encima de una nota mas reciente", () => {
    const nota: Novedad = {
      tipo: "nota",
      cursoId: "c1",
      cursoTitulo: "Curso",
      titulo: "Taller",
      href: "/estudiante/notas",
      fecha: new Date("2026-11-22T09:00:00"),
      porcentaje: 80,
      retroalimentacion: null,
    };
    const vence = plazo("Entrega", new Date("2026-11-24T23:59:00"), 2);

    expect(ordenarNovedades([nota, vence]).map((n) => n.tipo)).toEqual(["plazo", "nota"]);
  });

  it("entre plazos, el que vence antes va arriba", () => {
    const lejos = plazo("Lejos", new Date("2026-11-28T23:59:00"), 6);
    const cerca = plazo("Cerca", new Date("2026-11-23T23:59:00"), 1);

    expect(ordenarNovedades([lejos, cerca]).map((n) => n.titulo)).toEqual(["Cerca", "Lejos"]);
  });

  it("entre material, lo mas reciente va arriba", () => {
    const viejo = material("Vieja", new Date("2026-11-15T10:00:00"));
    const nuevo = material("Nueva", new Date("2026-11-21T10:00:00"));

    expect(ordenarNovedades([viejo, nuevo]).map((n) => n.titulo)).toEqual(["Nueva", "Vieja"]);
  });

  it("no modifica el arreglo que recibe", () => {
    const entrada = [material("A", new Date("2026-11-15T10:00:00")), plazo("B", AHORA, 0)];
    ordenarNovedades(entrada);
    expect(entrada.map((n) => n.titulo)).toEqual(["A", "B"]);
  });

  // US53 (25/11/2026): el anuncio del docente es la única novedad que
  // alguien escribió a propósito; el resto las deduce la plataforma.
  it("pone el anuncio del docente arriba de un plazo que vence hoy", () => {
    const vence = plazo("Entrega", AHORA, 0);
    const resultado = ordenarNovedades([vence, anuncio("Traigan la protoboard", AHORA)]);

    expect(resultado.map((n) => n.tipo)).toEqual(["anuncio", "plazo"]);
  });

  it("entre anuncios, el más reciente va arriba", () => {
    const viejo = anuncio("De la semana pasada", new Date("2026-11-16T10:00:00"));
    const nuevo = anuncio("De hoy", new Date("2026-11-22T08:00:00"));

    expect(ordenarNovedades([viejo, nuevo]).map((n) => n.titulo)).toEqual([
      "De hoy",
      "De la semana pasada",
    ]);
  });

  it("mantiene el orden completo con los cuatro tipos", () => {
    const resultado = ordenarNovedades([
      material("Lección nueva", new Date("2026-11-21T10:00:00")),
      {
        tipo: "nota",
        cursoId: "c1",
        cursoTitulo: "Curso",
        titulo: "Taller",
        href: "/estudiante/notas",
        fecha: new Date("2026-11-22T09:00:00"),
        porcentaje: 80,
        retroalimentacion: null,
      },
      plazo("Entrega", new Date("2026-11-24T23:59:00"), 2),
      anuncio("Aviso", new Date("2026-11-20T10:00:00")),
    ]);

    expect(resultado.map((n) => n.tipo)).toEqual(["anuncio", "plazo", "nota", "material"]);
  });
});
