/**
 * US52 — la ventana de entrega y el tipo exigido (25/11/2026).
 */
import { describe, it, expect } from "vitest";
import {
  estadoDeLaEntrega,
  entregaCerrada,
  cierreCoherente,
  faltaParaEntregar,
  textoDeLoQueSeEspera,
} from "./activity-submission";

const ahora = new Date("2026-11-25T10:00:00Z");
const ayer = new Date("2026-11-24T10:00:00Z");
const manana = new Date("2026-11-26T10:00:00Z");

describe("estadoDeLaEntrega", () => {
  // El caso que no debe cambiar: una actividad sin ninguna fecha, o con
  // solo vencimiento, se comporta como antes de esta historia.
  it("sin fechas, está abierta", () => {
    expect(estadoDeLaEntrega({ fechaLimite: null, fechaCierre: null }, ahora)).toBe("abierta");
  });

  it("antes del vencimiento, está abierta", () => {
    expect(estadoDeLaEntrega({ fechaLimite: manana, fechaCierre: null }, ahora)).toBe("abierta");
  });

  it("pasado el vencimiento y sin cierre, se marca fuera de plazo pero no se cierra", () => {
    expect(estadoDeLaEntrega({ fechaLimite: ayer, fechaCierre: null }, ahora)).toBe(
      "fuera_de_plazo"
    );
  });

  it("pasado el cierre, está cerrada", () => {
    expect(estadoDeLaEntrega({ fechaLimite: ayer, fechaCierre: ayer }, ahora)).toBe("cerrada");
  });

  it("entre el vencimiento y el cierre, sigue aceptando pero fuera de plazo", () => {
    // Es la ventana que esta historia hace posible: tarde, pero a tiempo.
    expect(estadoDeLaEntrega({ fechaLimite: ayer, fechaCierre: manana }, ahora)).toBe(
      "fuera_de_plazo"
    );
  });

  it("cerrada manda sobre fuera de plazo", () => {
    expect(entregaCerrada({ fechaLimite: ayer, fechaCierre: ayer }, ahora)).toBe(true);
    expect(entregaCerrada({ fechaLimite: ayer, fechaCierre: manana }, ahora)).toBe(false);
  });

  it("un cierre sin vencimiento también cierra", () => {
    expect(estadoDeLaEntrega({ fechaLimite: null, fechaCierre: ayer }, ahora)).toBe("cerrada");
  });
});

describe("cierreCoherente", () => {
  it("acepta un cierre posterior al vencimiento", () => {
    expect(cierreCoherente({ fechaLimite: ahora, fechaCierre: manana })).toBe(true);
  });

  it("acepta las dos fechas iguales", () => {
    expect(cierreCoherente({ fechaLimite: ahora, fechaCierre: ahora })).toBe(true);
  });

  it("RECHAZA un cierre anterior al vencimiento", () => {
    // Dejaría una actividad donde entregar a tiempo es imposible.
    expect(cierreCoherente({ fechaLimite: manana, fechaCierre: ahora })).toBe(false);
  });

  it("no exige nada si falta alguna de las dos", () => {
    expect(cierreCoherente({ fechaLimite: null, fechaCierre: manana })).toBe(true);
    expect(cierreCoherente({ fechaLimite: manana, fechaCierre: null })).toBe(true);
  });
});

describe("faltaParaEntregar", () => {
  it("AMBOS acepta solo texto, solo archivo, o los dos", () => {
    expect(faltaParaEntregar("AMBOS", { tendraTexto: true, tendraArchivo: false })).toBeNull();
    expect(faltaParaEntregar("AMBOS", { tendraTexto: false, tendraArchivo: true })).toBeNull();
    expect(faltaParaEntregar("AMBOS", { tendraTexto: true, tendraArchivo: true })).toBeNull();
  });

  it("AMBOS rechaza una entrega vacía", () => {
    expect(faltaParaEntregar("AMBOS", { tendraTexto: false, tendraArchivo: false })).toBe(
      "Escribe tu respuesta o adjunta un archivo."
    );
  });

  it("SOLO_TEXTO exige texto, aunque venga un archivo", () => {
    expect(faltaParaEntregar("SOLO_TEXTO", { tendraTexto: false, tendraArchivo: true })).toBe(
      "Esta actividad se entrega escribiendo tu respuesta."
    );
    expect(faltaParaEntregar("SOLO_TEXTO", { tendraTexto: true, tendraArchivo: false })).toBeNull();
  });

  it("SOLO_ARCHIVO exige archivo, aunque venga texto", () => {
    expect(faltaParaEntregar("SOLO_ARCHIVO", { tendraTexto: true, tendraArchivo: false })).toBe(
      "Esta actividad se entrega adjuntando un archivo."
    );
    expect(
      faltaParaEntregar("SOLO_ARCHIVO", { tendraTexto: false, tendraArchivo: true })
    ).toBeNull();
  });

  // Exigir uno no prohíbe el otro: si el docente pide archivo y el
  // estudiante además escribe algo, eso no es un error.
  it("exigir uno no impide mandar el otro de más", () => {
    expect(faltaParaEntregar("SOLO_TEXTO", { tendraTexto: true, tendraArchivo: true })).toBeNull();
    expect(
      faltaParaEntregar("SOLO_ARCHIVO", { tendraTexto: true, tendraArchivo: true })
    ).toBeNull();
  });
});

describe("textoDeLoQueSeEspera", () => {
  it("dice qué se espera según el tipo", () => {
    expect(textoDeLoQueSeEspera("SOLO_TEXTO")).toContain("Escribe");
    expect(textoDeLoQueSeEspera("SOLO_ARCHIVO")).toContain("Adjunta");
    expect(textoDeLoQueSeEspera("AMBOS")).toContain("las dos cosas");
  });
});
