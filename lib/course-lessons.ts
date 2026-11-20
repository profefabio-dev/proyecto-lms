/**
 * US43 (20/11/2026) — el curso como secuencia de lecciones.
 *
 * Hasta hoy la página del curso del Estudiante mostraba TODOS los
 * contenidos desplegados en una sola página: el video, el texto completo y
 * la lista de documentos, uno debajo del otro. El docente lo resumió así:
 * "no se me parece a un LMS, es muy básico" y, al ver un curso sembrado con
 * todos los recursos, "es lo mismo". El problema no era el contenido sino la
 * forma: una lista plana larga se lee como un blog, no como un aula.
 *
 * El rediseño convierte el curso en dos pantallas: un temario (la lista de
 * lecciones, sin desplegar nada) y un reproductor que muestra UNA lección a
 * la vez, con el temario al lado para navegar. Eso exige poder hablar del
 * curso como una secuencia ordenada —qué lección va antes, cuál sigue, cuál
 * es la primera pendiente— y de eso se encarga este módulo.
 *
 * Igual que `calcularProgreso` y `agruparContenidoPorSeccion`, aquí no se
 * toca Prisma: todo son funciones sobre arreglos ya resueltos, así se
 * prueban solas y las usan por igual las dos páginas y la Server Action que
 * marca una lección como completada.
 */

type ContenidoAccesible = { visible: boolean; seccionId: string | null };
type SeccionConEstado = { id: string; estado: string };

/**
 * US30 + US43: qué contenidos puede ver realmente el Estudiante.
 *
 * Son dos reglas acumuladas, antes repetidas a mano en la página del curso:
 * el contenido tiene que estar `visible`, y si pertenece a una sección, esa
 * sección no puede estar "No disponible" — el contenido de una sección
 * cerrada queda tan oculto como uno invisible (ni se lista, ni cuenta para
 * el avance). El contenido sin sección nunca se ve afectado por lo segundo.
 *
 * Vive aquí, y no en cada página, porque ahora son tres los lugares que
 * necesitan exactamente el mismo criterio: el temario, el reproductor y
 * `completarLeccion` (que calcula a dónde seguir). Si el criterio se
 * desalineara entre ellos, el reproductor podría abrir una lección que el
 * temario esconde.
 */
export function filtrarContenidosAccesibles<
  C extends ContenidoAccesible,
  S extends SeccionConEstado,
>(contenidos: C[], secciones: S[]): C[] {
  const estadoPorSeccion = new Map(secciones.map((seccion) => [seccion.id, seccion.estado]));

  return contenidos.filter((contenido) => {
    if (!contenido.visible) {
      return false;
    }

    if (contenido.seccionId && estadoPorSeccion.get(contenido.seccionId) === "NO_DISPONIBLE") {
      return false;
    }

    return true;
  });
}

type ContenidoConSeccion = { seccionId: string | null };
type SeccionBase = { id: string };

/**
 * Ordena los contenidos en el mismo orden en que el temario los muestra:
 * sección por sección (en el orden de las secciones, y dentro de cada una
 * en el orden de los contenidos), y al final el contenido suelto.
 *
 * Que este orden coincida con el del temario no es un detalle estético: es
 * lo que hace que "Siguiente" en el reproductor lleve a la lección que el
 * estudiante ve justo debajo en la lista. `secciones` y `contenidos` deben
 * llegar ya ordenados por `orden` desde Prisma, igual que en las páginas.
 */
export function ordenarLecciones<C extends ContenidoConSeccion, S extends SeccionBase>(
  contenidos: C[],
  secciones: S[]
): C[] {
  const porSeccion = secciones.flatMap((seccion) =>
    contenidos.filter((contenido) => contenido.seccionId === seccion.id)
  );
  const sueltos = contenidos.filter((contenido) => contenido.seccionId === null);

  return [...porSeccion, ...sueltos];
}

/**
 * Ubica una lección dentro de la secuencia y devuelve sus vecinas, para
 * armar los botones "Anterior" y "Siguiente" del reproductor.
 *
 * Si el id no está en la secuencia (lección oculta, de otra sección cerrada,
 * o un id inventado en la URL) devuelve `indice: -1` y todo en `null`: la
 * página lo usa para responder 404 en vez de mostrar una lección vacía.
 */
export function ubicarLeccion<C extends { id: string }>(
  lecciones: C[],
  contenidoId: string
): { indice: number; actual: C | null; anterior: C | null; siguiente: C | null } {
  const indice = lecciones.findIndex((leccion) => leccion.id === contenidoId);

  if (indice === -1) {
    return { indice: -1, actual: null, anterior: null, siguiente: null };
  }

  return {
    indice,
    actual: lecciones[indice],
    anterior: indice > 0 ? lecciones[indice - 1] : null,
    siguiente: indice < lecciones.length - 1 ? lecciones[indice + 1] : null,
  };
}

/**
 * La lección por la que conviene retomar el curso: la primera que el
 * estudiante todavía no ha marcado como completada.
 *
 * Si ya completó todas, devuelve la primera — así el botón "Continuar"
 * nunca queda muerto y sirve para repasar. Si el curso no tiene lecciones
 * accesibles, devuelve `null` y quien llama muestra el estado vacío.
 */
export function siguienteLeccionPendiente<C extends { id: string }>(
  lecciones: C[],
  idsVistos: Set<string> | ReadonlySet<string>
): C | null {
  if (lecciones.length === 0) {
    return null;
  }

  return lecciones.find((leccion) => !idsVistos.has(leccion.id)) ?? lecciones[0];
}
