import { describe, it, expect } from "vitest";
import { diasHasta, textoDePlazo } from "./novedades";

// 26/11/2026: este archivo probaba además `dentroDeLaVentana`,
// `proximosDias` y `ordenarNovedades`, que se retiraron junto con
// `news-feed.tsx` cuando el rediseño del 25/11 reemplazó la lista única de
// novedades por los tres bloques de la agenda del estudiante. Quedan las
// dos funciones que esa agenda sí usa — ver la cabecera de `novedades.ts`.

const AHORA = new Date("2026-11-22T10:00:00");

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
