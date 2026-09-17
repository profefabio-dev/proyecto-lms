import { describe, expect, it } from "vitest";
import { generarEmailInterno } from "./generar-email-interno";

describe("generarEmailInterno", () => {
  it("genera un email a partir de nombre y apellido, sin tildes ni espacios", () => {
    const email = generarEmailInterno("Carlos Andrés", "Gaviria Ríos", () => false);
    expect(email).toBe("carlosandres.gaviriarios@estudiantes-lms.local");
  });

  it("agrega un sufijo numérico creciente si el candidato ya existe", () => {
    const usados = new Set(["carlos.gaviria@estudiantes-lms.local", "carlos2.gaviria@estudiantes-lms.local"]);
    const email = generarEmailInterno("Carlos", "Gaviria", (candidato) => usados.has(candidato));
    expect(email).toBe("carlos.gaviria2@estudiantes-lms.local");
  });

  it("no agrega sufijo si el candidato base está libre", () => {
    const email = generarEmailInterno("Ana", "Torres", () => false);
    expect(email).toBe("ana.torres@estudiantes-lms.local");
  });

  it("usa un valor de reserva si nombre y apellido quedan vacíos tras normalizar", () => {
    const email = generarEmailInterno("...", "---", () => false);
    expect(email).toBe("estudiante@estudiantes-lms.local");
  });
});
