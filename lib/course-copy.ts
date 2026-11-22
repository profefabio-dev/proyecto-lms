/**
 * US47 — qué se copia cuando un Tutor adopta el curso de otro (23/11/2026).
 *
 * La decisión de fondo, tomada con el docente: adoptar **copia** el curso
 * en vez de compartirlo vivo. "Adaptar para mi uso" y "editar el recurso de
 * otro" son cosas opuestas — si el adoptante editara el original, le
 * cambiaría el curso a los estudiantes del autor sin que este se entere.
 *
 * Y al copiar desaparece la necesidad de un rol nuevo: el adoptante es
 * dueño de su copia, así que toda la autorización que ya existe
 * (`curso.tutorId === usuarioActual.id`, US24) sigue valiendo sin tocar una
 * línea. No hay dos sistemas de permisos conviviendo.
 *
 * Este módulo es la parte que se puede probar sola: recibe el curso leído y
 * devuelve los datos de la copia, sin tocar Prisma ni Storage. Lo que
 * importa que quede fijado por pruebas no es el detalle de los campos, es
 * **la regla de qué nunca viaja**: entregas, notas, intentos e
 * inscripciones son de los estudiantes del otro docente y no tienen nada
 * que hacer en un curso ajeno.
 */

export type SeccionOriginal = {
  id: string;
  titulo: string;
  orden: number;
  estado: string;
  esActual: boolean;
};

export type ContenidoOriginal = {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  contenido: string;
  orden: number;
  visible: boolean;
  seccionId: string | null;
  documentos: { archivo: string; nombre: string; tipo: string }[];
};

export type ActividadOriginal = {
  id: string;
  titulo: string;
  descripcion: string | null;
  instrucciones: string;
  puntajeMaximo: number;
  fechaLimite: Date | null;
  visible: boolean;
  orden: number;
  seccionId: string | null;
};

export type QuizOriginal = {
  id: string;
  titulo: string;
  descripcion: string | null;
  visible: boolean;
  orden: number;
  intentosMaximos: number | null;
  seccionId: string | null;
  preguntas: {
    enunciado: string;
    orden: number;
    opciones: { texto: string; esCorrecta: boolean; orden: number }[];
  }[];
};

export type CursoOriginal = {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string | null;
  tutor: { nombre: string; apellido: string };
  secciones: SeccionOriginal[];
  contenidos: ContenidoOriginal[];
  actividades: ActividadOriginal[];
  quizzes: QuizOriginal[];
};

/**
 * El nombre del autor tal como se guardará en la copia. Se congela en el
 * momento de adoptar: si el autor cambia de apellido o se va, el crédito
 * sigue diciendo quién hizo el trabajo.
 */
export function creditoDelAutor(tutor: { nombre: string; apellido: string }): string {
  return `${tutor.nombre} ${tutor.apellido}`.trim();
}

/**
 * Los datos del curso nuevo. **Nace en BORRADOR** aunque el original
 * estuviera publicado: el adoptante tiene que poder revisarlo y adaptarlo
 * antes de que sus estudiantes lo vean. Y nace con `compartible: false` —
 * compartir de nuevo una copia es una decisión suya, no algo heredado.
 */
export function datosDelCursoCopiado(original: CursoOriginal, tutorIdDestino: string) {
  return {
    titulo: original.titulo,
    descripcion: original.descripcion,
    imagen: original.imagen,
    tutorId: tutorIdDestino,
    estado: "BORRADOR" as const,
    compartible: false,
    origenCursoId: original.id,
    origenAutor: creditoDelAutor(original.tutor),
  };
}

/**
 * Las secciones de la copia, en orden, junto con la correspondencia entre
 * el id viejo y la posición en el arreglo. Hace falta porque contenidos,
 * actividades y evaluaciones apuntan a su sección por id, y esos ids
 * cambian al copiar: sin remapear, todo quedaría colgando de secciones del
 * curso original (o, peor, de secciones de otro curso).
 */
export function seccionesCopiadas(secciones: SeccionOriginal[]) {
  const ordenadas = [...secciones].sort((a, b) => a.orden - b.orden);

  return {
    datos: ordenadas.map((seccion) => ({
      titulo: seccion.titulo,
      orden: seccion.orden,
      estado: seccion.estado,
      esActual: seccion.esActual,
    })),
    /** id viejo → posición en `datos`, para resolverlo tras insertarlas. */
    posicionPorIdViejo: new Map<string, number>(
      ordenadas.map((seccion, posicion) => [seccion.id, posicion])
    ),
  };
}

/**
 * Traduce el `seccionId` del original al de la copia. Un contenido sin
 * sección sigue sin sección, y uno que apunte a una sección que no vino en
 * el curso (no debería pasar, pero el dato manda) queda sin sección en vez
 * de apuntar a cualquier cosa.
 */
export function traducirSeccion(
  seccionIdViejo: string | null,
  idsNuevosPorPosicion: string[],
  posicionPorIdViejo: Map<string, number>
): string | null {
  if (!seccionIdViejo) return null;

  const posicion = posicionPorIdViejo.get(seccionIdViejo);
  if (posicion === undefined) return null;

  return idsNuevosPorPosicion[posicion] ?? null;
}

/**
 * Lo que se copia de una evaluación, con sus preguntas y opciones —
 * **incluida `esCorrecta`**, que aquí sí viaja: es el servidor copiando de
 * una tabla a otra, no datos saliendo al navegador (ver la página del
 * estudiante y su prueba del bloque D).
 *
 * Los intentos de los estudiantes del autor no se copian.
 */
export function datosDelQuizCopiado(quiz: QuizOriginal, seccionIdNuevo: string | null) {
  return {
    titulo: quiz.titulo,
    descripcion: quiz.descripcion,
    visible: quiz.visible,
    orden: quiz.orden,
    intentosMaximos: quiz.intentosMaximos,
    seccionId: seccionIdNuevo,
    preguntas: {
      create: [...quiz.preguntas]
        .sort((a, b) => a.orden - b.orden)
        .map((pregunta) => ({
          enunciado: pregunta.enunciado,
          orden: pregunta.orden,
          opciones: {
            create: [...pregunta.opciones]
              .sort((a, b) => a.orden - b.orden)
              .map((opcion) => ({
                texto: opcion.texto,
                esCorrecta: opcion.esCorrecta,
                orden: opcion.orden,
              })),
          },
        })),
    },
  };
}

/**
 * Lo que se copia de una actividad. **La fecha límite no se copia**: era la
 * del calendario del otro docente y, si ya pasó, la copia nacería con todas
 * sus actividades vencidas. El adoptante le pone la suya al adaptarla.
 */
export function datosDeLaActividadCopiada(
  actividad: ActividadOriginal,
  seccionIdNuevo: string | null
) {
  return {
    titulo: actividad.titulo,
    descripcion: actividad.descripcion,
    instrucciones: actividad.instrucciones,
    puntajeMaximo: actividad.puntajeMaximo,
    fechaLimite: null,
    visible: actividad.visible,
    orden: actividad.orden,
    seccionId: seccionIdNuevo,
  };
}
