import { describe, it, expect } from "vitest";
import {
  creditoDelAutor,
  datosDelCursoCopiado,
  datosDeLaActividadCopiada,
  datosDelQuizCopiado,
  seccionesCopiadas,
  traducirSeccion,
  type CursoOriginal,
} from "./course-copy";

function cursoOriginal(): CursoOriginal {
  return {
    id: "curso-original",
    titulo: "Fundamentos de la informática",
    descripcion: "Un curso",
    imagen: "https://ejemplo/portada.jpg",
    tutor: { nombre: "Ana", apellido: "Ríos" },
    secciones: [
      { id: "s2", titulo: "Semana 2", orden: 1, estado: "NO_DISPONIBLE", esActual: false },
      { id: "s1", titulo: "Semana 1", orden: 0, estado: "DISPONIBLE", esActual: true },
    ],
    contenidos: [],
    actividades: [],
    quizzes: [],
  };
}

describe("datosDelCursoCopiado (US47)", () => {
  it("la copia nace en BORRADOR aunque el original esté publicado", () => {
    expect(datosDelCursoCopiado(cursoOriginal(), "tutor-2").estado).toBe("BORRADOR");
  });

  it("la copia no nace compartida: volver a compartirla es decisión del adoptante", () => {
    expect(datosDelCursoCopiado(cursoOriginal(), "tutor-2").compartible).toBe(false);
  });

  it("la copia pertenece a quien la adopta, no al autor", () => {
    expect(datosDelCursoCopiado(cursoOriginal(), "tutor-2").tutorId).toBe("tutor-2");
  });

  it("guarda de dónde salió y el crédito del autor", () => {
    const copia = datosDelCursoCopiado(cursoOriginal(), "tutor-2");

    expect(copia.origenCursoId).toBe("curso-original");
    expect(copia.origenAutor).toBe("Ana Ríos");
  });

  it("NUNCA arrastra inscripciones, entregas, notas ni intentos", () => {
    // La regla que esta historia no puede romper: eso es de los
    // estudiantes del otro docente.
    const copia = datosDelCursoCopiado(cursoOriginal(), "tutor-2") as Record<string, unknown>;

    for (const campo of ["inscritos", "entregas", "notas", "intentos", "contentViews"]) {
      expect(copia).not.toHaveProperty(campo);
    }
  });
});

describe("creditoDelAutor (US47)", () => {
  it("junta nombre y apellido", () => {
    expect(creditoDelAutor({ nombre: "Ana", apellido: "Ríos" })).toBe("Ana Ríos");
  });

  it("no deja espacios sueltos si falta el apellido", () => {
    expect(creditoDelAutor({ nombre: "Ana", apellido: "" })).toBe("Ana");
  });
});

describe("seccionesCopiadas (US47)", () => {
  it("las devuelve ordenadas, no en el orden en que vinieron", () => {
    const { datos } = seccionesCopiadas(cursoOriginal().secciones);

    expect(datos.map((s) => s.titulo)).toEqual(["Semana 1", "Semana 2"]);
  });

  it("conserva estado y la marca de semana actual", () => {
    const { datos } = seccionesCopiadas(cursoOriginal().secciones);

    expect(datos[0]).toMatchObject({ estado: "DISPONIBLE", esActual: true });
    expect(datos[1]).toMatchObject({ estado: "NO_DISPONIBLE", esActual: false });
  });

  it("deja la correspondencia para poder remapear después", () => {
    const { posicionPorIdViejo } = seccionesCopiadas(cursoOriginal().secciones);

    expect(posicionPorIdViejo.get("s1")).toBe(0);
    expect(posicionPorIdViejo.get("s2")).toBe(1);
  });
});

describe("traducirSeccion (US47)", () => {
  const { posicionPorIdViejo } = seccionesCopiadas(cursoOriginal().secciones);
  const nuevos = ["nueva-1", "nueva-2"];

  it("lleva el contenido a la sección equivalente de la copia", () => {
    expect(traducirSeccion("s1", nuevos, posicionPorIdViejo)).toBe("nueva-1");
    expect(traducirSeccion("s2", nuevos, posicionPorIdViejo)).toBe("nueva-2");
  });

  it("un contenido sin sección sigue sin sección", () => {
    expect(traducirSeccion(null, nuevos, posicionPorIdViejo)).toBeNull();
  });

  it("si la sección no vino en el curso, queda sin sección y no apunta a otra", () => {
    // Nunca debería pasar, pero apuntar a una sección equivocada sería
    // peor que no apuntar a ninguna.
    expect(traducirSeccion("de-otro-curso", nuevos, posicionPorIdViejo)).toBeNull();
  });
});

describe("datosDeLaActividadCopiada (US47)", () => {
  const actividad = {
    id: "a1",
    titulo: "Taller",
    descripcion: null,
    instrucciones: "Haz esto",
    puntajeMaximo: 50,
    fechaLimite: new Date("2026-03-01T00:00:00"),
    visible: true,
    orden: 0,
    seccionId: "s1",
  };

  it("NO copia la fecha límite: era del calendario del otro docente", () => {
    // Si se copiara, la copia nacería con todas sus actividades vencidas.
    expect(datosDeLaActividadCopiada(actividad, "nueva-1").fechaLimite).toBeNull();
  });

  it("conserva instrucciones y puntaje, y apunta a la sección nueva", () => {
    const copia = datosDeLaActividadCopiada(actividad, "nueva-1");

    expect(copia).toMatchObject({
      instrucciones: "Haz esto",
      puntajeMaximo: 50,
      seccionId: "nueva-1",
    });
  });
});

describe("datosDelQuizCopiado (US47)", () => {
  const quiz = {
    id: "q1",
    titulo: "Repaso",
    descripcion: null,
    visible: true,
    orden: 0,
    intentosMaximos: 2,
    seccionId: "s1",
    preguntas: [
      {
        enunciado: "Segunda",
        orden: 1,
        opciones: [{ texto: "B", esCorrecta: true, orden: 0 }],
      },
      {
        enunciado: "Primera",
        orden: 0,
        opciones: [
          { texto: "Mala", esCorrecta: false, orden: 1 },
          { texto: "Buena", esCorrecta: true, orden: 0 },
        ],
      },
    ],
  };

  it("copia preguntas y opciones en su orden, no en el que vinieron", () => {
    const copia = datosDelQuizCopiado(quiz, "nueva-1");

    expect(copia.preguntas.create.map((p) => p.enunciado)).toEqual(["Primera", "Segunda"]);
    expect(copia.preguntas.create[0].opciones.create.map((o) => o.texto)).toEqual([
      "Buena",
      "Mala",
    ]);
  });

  it("copia cuál es la respuesta correcta", () => {
    // Aquí esCorrecta SÍ viaja: es el servidor copiando entre tablas, no
    // un dato saliendo al navegador (eso lo cubre la prueba del bloque D).
    const copia = datosDelQuizCopiado(quiz, "nueva-1");
    const correctas = copia.preguntas.create[0].opciones.create.filter((o) => o.esCorrecta);

    expect(correctas).toHaveLength(1);
    expect(correctas[0].texto).toBe("Buena");
  });

  it("conserva el límite de intentos", () => {
    expect(datosDelQuizCopiado(quiz, "nueva-1").intentosMaximos).toBe(2);
  });

  it("no arrastra los intentos de los estudiantes del autor", () => {
    expect(datosDelQuizCopiado(quiz, "nueva-1")).not.toHaveProperty("intentos");
  });
});
