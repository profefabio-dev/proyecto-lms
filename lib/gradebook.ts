/**
 * La planilla de notas de un curso (22/11/2026).
 *
 * Nace de un pedido del docente al probar el seguimiento: *"el tutor debería
 * ver fácilmente el listado de estudiantes por curso y ver quiénes han
 * entregado las actividades, quiénes no y la puntuación de cada una"*. El
 * panel de US39 responde "¿cómo va cada estudiante?" con un promedio, pero
 * no permite ver de un vistazo quién no entregó **qué**, que es lo que hace
 * falta para saber a quién reclamarle cuál trabajo.
 *
 * Es una matriz: una fila por estudiante, una columna por actividad y por
 * evaluación publicada. Las funciones de aquí son puras —reciben datos ya
 * consultados y no tocan Prisma— por el mismo motivo que `lib/grades.ts` y
 * `lib/route-progress.ts`: el cruce se arma en memoria con dos consultas
 * para todo el curso, en vez de una por estudiante.
 *
 * Todo se normaliza a porcentaje antes de promediar, igual que en US39 y
 * US46: una actividad trae una nota sobre su propio `puntajeMaximo` y un
 * quiz trae un porcentaje, así que sumarlos en bruto no significaría nada.
 */

import { porcentajeDeNota, promediarPorcentajes } from "./grades";

export type TipoColumna = "ACTIVIDAD" | "EVALUACION";

export type ColumnaPlanilla = {
  id: string;
  titulo: string;
  tipo: TipoColumna;
};

/**
 * El estado de un estudiante en una columna. Son tres situaciones que el
 * docente trata distinto y que por eso no se colapsan en un número:
 * `sin_entregar` es a quien hay que reclamarle, `sin_calificar` es trabajo
 * que espera **al docente**, y `calificada` ya cerró.
 */
export type CeldaPlanilla =
  | { estado: "sin_entregar" }
  | { estado: "sin_calificar" }
  | { estado: "calificada"; porcentaje: number };

export type FilaPlanilla<E> = {
  estudiante: E;
  celdas: CeldaPlanilla[];
  /** Promedio de las celdas ya calificadas; `null` si no hay ninguna. */
  promedio: number | null;
  sinEntregar: number;
};

type EntregaMinima = { actividadId: string; userId: string; nota: number | null };
type IntentoMinimo = { quizId: string; userId: string; puntaje: number };

export function celdaDeActividad(
  entrega: EntregaMinima | undefined,
  puntajeMaximo: number
): CeldaPlanilla {
  if (!entrega) return { estado: "sin_entregar" };
  if (entrega.nota === null) return { estado: "sin_calificar" };
  return { estado: "calificada", porcentaje: porcentajeDeNota(entrega.nota, puntajeMaximo) };
}

/**
 * De un quiz se toma el **mejor** intento, mismo criterio que la página del
 * curso y que "Mis notas" (US46): repetir es parte del aprendizaje, así que
 * la nota que cuenta es la mejor, no la última. Un quiz no tiene estado
 * "sin calificar" — se califica solo al responderlo.
 */
export function celdaDeQuiz(intentos: IntentoMinimo[]): CeldaPlanilla {
  if (intentos.length === 0) return { estado: "sin_entregar" };
  return {
    estado: "calificada",
    porcentaje: Math.max(...intentos.map((intento) => intento.puntaje)),
  };
}

export function construirPlanilla<E extends { id: string }>({
  estudiantes,
  actividades,
  quizzes,
  entregas,
  intentos,
}: {
  estudiantes: E[];
  actividades: { id: string; titulo: string; puntajeMaximo: number }[];
  quizzes: { id: string; titulo: string }[];
  entregas: EntregaMinima[];
  intentos: IntentoMinimo[];
}): { columnas: ColumnaPlanilla[]; filas: FilaPlanilla<E>[] } {
  const columnas: ColumnaPlanilla[] = [
    ...actividades.map((a) => ({ id: a.id, titulo: a.titulo, tipo: "ACTIVIDAD" as const })),
    ...quizzes.map((q) => ({ id: q.id, titulo: q.titulo, tipo: "EVALUACION" as const })),
  ];

  const filas = estudiantes.map((estudiante) => {
    const celdas: CeldaPlanilla[] = [
      ...actividades.map((actividad) =>
        celdaDeActividad(
          entregas.find(
            (entrega) =>
              entrega.actividadId === actividad.id && entrega.userId === estudiante.id
          ),
          actividad.puntajeMaximo
        )
      ),
      ...quizzes.map((quiz) =>
        celdaDeQuiz(
          intentos.filter(
            (intento) => intento.quizId === quiz.id && intento.userId === estudiante.id
          )
        )
      ),
    ];

    const porcentajes = celdas
      .filter((celda): celda is Extract<CeldaPlanilla, { estado: "calificada" }> =>
        celda.estado === "calificada"
      )
      .map((celda) => celda.porcentaje);

    return {
      estudiante,
      celdas,
      promedio: promediarPorcentajes(porcentajes),
      sinEntregar: celdas.filter((celda) => celda.estado === "sin_entregar").length,
    };
  });

  return { columnas, filas };
}
