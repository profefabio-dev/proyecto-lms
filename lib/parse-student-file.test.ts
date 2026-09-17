import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  detectarColumnas,
  dividirNombreApellido,
  esFilaDeEncabezado,
  normalizarTexto,
  parsearFilasHoja,
  parsearTextoPdf,
  parsearWorkbookExcel,
} from "./parse-student-file";

describe("normalizarTexto", () => {
  it("quita tildes y pasa a minúsculas", () => {
    expect(normalizarTexto("Nómbre")).toBe("nombre");
    expect(normalizarTexto("APELLIDOS")).toBe("apellidos");
    expect(normalizarTexto("  Grado  ")).toBe("grado");
  });

  it("colapsa espacios internos repetidos (16/09/2026)", () => {
    expect(normalizarTexto("Apellidos,  Nombres")).toBe("apellidos, nombres");
  });
});

describe("detectarColumnas", () => {
  it("encuentra nombre y apellido sin importar mayúsculas/tildes", () => {
    const columnas = detectarColumnas(["Nro", "NOMBRE", "Apéllido", "Grado"]);
    expect(columnas.indiceNombre).toBe(1);
    expect(columnas.indiceApellido).toBe(2);
    expect(columnas.indiceGrado).toBe(3);
    expect(columnas.indiceNombreCompleto).toBeNull();
  });

  it("reconoce una columna de nombre completo", () => {
    const columnas = detectarColumnas(["#", "Estudiante", "Curso"]);
    expect(columnas.indiceNombreCompleto).toBe(1);
    expect(columnas.indiceNombre).toBeNull();
    expect(columnas.indiceGrado).toBe(2);
  });

  it("reconoce 'Apellidos,  Nombres' (formato real de reportes SAE, corregido el 16/09/2026)", () => {
    const columnas = detectarColumnas(["", "Apellidos,  Nombres", "ALERTA", ""]);
    expect(columnas.indiceNombreCompleto).toBe(1);
  });

  it("ignora columnas no reconocidas sin fallar", () => {
    const columnas = detectarColumnas(["Foto", "Nro", "Nombre", "Apellido"]);
    expect(columnas.indiceNombre).toBe(2);
    expect(columnas.indiceApellido).toBe(3);
  });
});

describe("esFilaDeEncabezado", () => {
  it("es verdadero con nombre+apellido", () => {
    expect(esFilaDeEncabezado(["Nro", "Nombre", "Apellido"])).toBe(true);
  });

  it("es verdadero con nombre completo", () => {
    expect(esFilaDeEncabezado(["#", "Estudiante"])).toBe(true);
  });

  it("es falso para una fila de encabezado institucional", () => {
    expect(esFilaDeEncabezado(["Institución Educativa Central", "", ""])).toBe(false);
  });
});

describe("dividirNombreApellido", () => {
  it("separa por la coma cuando existe", () => {
    expect(dividirNombreApellido("Gaviria Ríos, Carlos Andrés")).toEqual({
      nombre: "Carlos Andrés",
      apellido: "Gaviria Ríos",
    });
  });

  it("usa el nombre conocido para aislar el apellido cuando no hay coma", () => {
    expect(dividirNombreApellido("Gaviria Ríos Carlos Andrés", "Carlos Andrés")).toEqual({
      nombre: "Carlos Andrés",
      apellido: "Gaviria Ríos",
    });
  });

  it("con dos palabras, asume 1 apellido + 1 nombre (heurístico, sin coma ni nombre conocido)", () => {
    expect(dividirNombreApellido("Gaviria Carlos")).toEqual({
      nombre: "Carlos",
      apellido: "Gaviria",
    });
  });

  it("con tres palabras, asume 2 apellidos + 1 nombre", () => {
    expect(dividirNombreApellido("Bravo Arbelaez Luciana")).toEqual({
      nombre: "Luciana",
      apellido: "Bravo Arbelaez",
    });
  });

  it("con cuatro palabras, asume 2 apellidos + 2 nombres (corrección 16/09/2026, caso real mayoritario en un listado de colegio)", () => {
    expect(dividirNombreApellido("Aguilera Lugo Mateo Jeronimo")).toEqual({
      nombre: "Mateo Jeronimo",
      apellido: "Aguilera Lugo",
    });
  });

  it("devuelve el texto completo como nombre si es una sola palabra", () => {
    expect(dividirNombreApellido("Carlos")).toEqual({ nombre: "Carlos", apellido: "" });
  });
});

describe("parsearFilasHoja", () => {
  it("ignora el bloque de encabezado institucional antes de la tabla real", () => {
    const filas = [
      ["Institución Educativa Central", "", ""],
      ["NIT: 900123456-1", "", ""],
      ["Año lectivo: 2026", "", ""],
      ["Nro", "Nombre", "Apellido"],
      ["1", "Carlos", "Gaviria"],
      ["2", "María", "Pérez"],
    ];

    const grupo = parsearFilasHoja(filas, "6A");
    expect(grupo).toEqual({
      nombre: "6A",
      estudiantes: [
        { nombre: "Carlos", apellido: "Gaviria" },
        { nombre: "María", apellido: "Pérez" },
      ],
    });
  });

  it("separa nombre completo concatenado cuando no hay columnas por separado", () => {
    const filas = [
      ["#", "Estudiante"],
      ["1", "Gaviria Ríos, Carlos Andrés"],
    ];

    const grupo = parsearFilasHoja(filas, "6B");
    expect(grupo?.estudiantes).toEqual([{ nombre: "Carlos Andrés", apellido: "Gaviria Ríos" }]);
  });

  it("corta el listado si aparece otra fila de encabezado", () => {
    const filas = [
      ["Nombre", "Apellido"],
      ["Carlos", "Gaviria"],
      ["Nombre", "Apellido"], // otra tabla empieza aquí
      ["Ana", "Torres"],
    ];

    const grupo = parsearFilasHoja(filas, "6C");
    expect(grupo?.estudiantes).toEqual([{ nombre: "Carlos", apellido: "Gaviria" }]);
  });

  it("no corta el listado por una fila vacía de separación", () => {
    const filas = [
      ["Nombre", "Apellido"],
      ["Carlos", "Gaviria"],
      ["", ""],
      ["Ana", "Torres"],
    ];

    const grupo = parsearFilasHoja(filas, "6D");
    expect(grupo?.estudiantes).toHaveLength(2);
  });

  it("devuelve null si no hay ninguna fila de encabezado reconocible", () => {
    const filas = [
      ["Institución Educativa Central"],
      ["Datos sin estructura reconocida"],
    ];
    expect(parsearFilasHoja(filas, "Hoja1")).toBeNull();
  });

  it("devuelve null si el encabezado existe pero no hay filas de datos", () => {
    const filas = [["Nombre", "Apellido"]];
    expect(parsearFilasHoja(filas, "Vacía")).toBeNull();
  });
});

describe("parsearWorkbookExcel", () => {
  function construirBuffer(hojas: Record<string, string[][]>): Buffer {
    const libro = XLSX.utils.book_new();
    for (const [nombre, filas] of Object.entries(hojas)) {
      XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), nombre);
    }
    return XLSX.write(libro, { type: "buffer", bookType: "xlsx" });
  }

  it("parsea varias hojas (una por grado/grupo) en un mismo archivo", () => {
    const buffer = construirBuffer({
      "6A": [
        ["Institución Educativa Central", "", ""],
        ["Nro", "Nombre", "Apellido"],
        ["1", "Carlos", "Gaviria"],
      ],
      "6B": [
        ["Nro", "Nombre", "Apellido"],
        ["1", "Ana", "Torres"],
        ["2", "Luis", "Ramírez"],
      ],
    });

    const resultado = parsearWorkbookExcel(buffer);
    expect(resultado.grupos).toHaveLength(2);
    expect(resultado.grupos[0].nombre).toBe("6A");
    expect(resultado.grupos[0].estudiantes).toEqual([{ nombre: "Carlos", apellido: "Gaviria" }]);
    expect(resultado.grupos[1].estudiantes).toHaveLength(2);
    expect(resultado.advertencias).toHaveLength(0);
  });

  it("agrega una advertencia por cada hoja sin columnas reconocibles, sin fallar el resto", () => {
    const buffer = construirBuffer({
      Notas: [["Esto no es un listado de estudiantes"]],
      "6A": [
        ["Nombre", "Apellido"],
        ["Carlos", "Gaviria"],
      ],
    });

    const resultado = parsearWorkbookExcel(buffer);
    expect(resultado.grupos).toHaveLength(1);
    expect(resultado.grupos[0].nombre).toBe("6A");
    expect(resultado.advertencias).toHaveLength(1);
    expect(resultado.advertencias[0]).toContain("Notas");
  });
});

describe("parsearTextoPdf", () => {
  it("reconoce varios grupos por su título y sus estudiantes numerados", () => {
    const texto = [
      "Institución Educativa Central",
      "NIT: 900123456-1",
      "Listado de Estudiantes 6A",
      "1. Gaviria Carlos",
      "2. Torres Ana",
      "Listado de Estudiantes 6B",
      "1. Ramírez Luis",
    ].join("\n");

    const resultado = parsearTextoPdf(texto);
    expect(resultado.grupos).toHaveLength(2);
    expect(resultado.grupos[0].nombre).toBe("6A");
    expect(resultado.grupos[0].estudiantes).toHaveLength(2);
    expect(resultado.grupos[1].nombre).toBe("6B");
    expect(resultado.grupos[1].estudiantes).toHaveLength(1);
  });

  it("ignora líneas de encabezado institucional aunque aparezcan mezcladas", () => {
    const texto = [
      "Listado de Estudiantes 6A",
      "Director de grupo: Marta Ruiz",
      "1. Gaviria Carlos",
    ].join("\n");

    const resultado = parsearTextoPdf(texto);
    expect(resultado.grupos[0].estudiantes).toEqual([{ nombre: "Carlos", apellido: "Gaviria" }]);
  });

  it("devuelve una advertencia y ningún grupo si no reconoce ninguna fila", () => {
    const resultado = parsearTextoPdf("Texto sin ningún patrón reconocible");
    expect(resultado.grupos).toHaveLength(0);
    expect(resultado.advertencias).toHaveLength(1);
  });
});
