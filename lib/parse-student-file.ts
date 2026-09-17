import * as XLSX from "xlsx";

export interface EstudianteExtraido {
  nombre: string;
  apellido: string;
}

export interface GrupoExtraido {
  nombre: string;
  estudiantes: EstudianteExtraido[];
}

export interface ResultadoParseo {
  grupos: GrupoExtraido[];
  advertencias: string[];
}

/**
 * US29: quita tildes/diacríticos y pasa a minúsculas, para comparar
 * encabezados y palabras clave sin depender de cómo los haya escrito cada
 * colegio ("Nombre", "NOMBRE", "Nómbre" deben compararse igual).
 */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const ENCABEZADOS_NOMBRE = ["nombre", "nombres"];
const ENCABEZADOS_APELLIDO = ["apellido", "apellidos"];
const ENCABEZADOS_NOMBRE_COMPLETO = [
  "estudiante",
  "nombre completo",
  "nombre del estudiante",
  "nombres y apellidos",
  "apellidos y nombres",
  // US29, corrección 16/09/2026: el formato real de varios colegios (ej.
  // reportes generados por el sistema "SAE") trae el encabezado con coma
  // en vez de "y" — "Apellidos, Nombres" — que no coincidía con ninguna
  // entrada de esta lista y hacía fallar la detección de la hoja entera
  // (`esFilaDeEncabezado` siempre false, ninguna fila se reconocía como
  // encabezado, la hoja completa se descartaba). El criterio 6 de esta
  // historia ya menciona textualmente este formato como ejemplo.
  "apellidos, nombres",
  "nombres, apellidos",
];
const ENCABEZADOS_GRADO = ["grado", "curso", "grupo", "salon", "seccion"];

interface ColumnasDetectadas {
  indiceNombre: number | null;
  indiceApellido: number | null;
  indiceNombreCompleto: number | null;
  indiceGrado: number | null;
}

/**
 * US29, criterio 2: ubica en qué columna está cada campo reconocido, por
 * el texto de su encabezado — nunca por posición fija, porque el conjunto
 * y el orden de columnas cambia según el colegio. Cualquier columna no
 * reconocida (`Nro`, `Foto`, etc.) simplemente no aparece aquí y se ignora
 * sin fallar en el resto del parseo.
 */
export function detectarColumnas(encabezados: string[]): ColumnasDetectadas {
  const normalizados = encabezados.map(normalizarTexto);
  const buscar = (candidatos: string[]): number | null => {
    const indice = normalizados.findIndex((valor) => candidatos.includes(valor));
    return indice === -1 ? null : indice;
  };

  return {
    indiceNombre: buscar(ENCABEZADOS_NOMBRE),
    indiceApellido: buscar(ENCABEZADOS_APELLIDO),
    indiceNombreCompleto: buscar(ENCABEZADOS_NOMBRE_COMPLETO),
    indiceGrado: buscar(ENCABEZADOS_GRADO),
  };
}

/**
 * US29, criterio 5: una fila cuenta como encabezado real solo si trae una
 * columna de nombre+apellido, o una de nombre completo — así se salta por
 * completo cualquier bloque de encabezado institucional (colegio, NIT,
 * código DANE, año lectivo, director de grupo...) que aparezca antes,
 * sin necesidad de reconocer esas palabras una por una.
 */
export function esFilaDeEncabezado(fila: string[]): boolean {
  const columnas = detectarColumnas(fila);
  return (
    (columnas.indiceNombre !== null && columnas.indiceApellido !== null) ||
    columnas.indiceNombreCompleto !== null
  );
}

/**
 * US29, criterio 6: separa un campo concatenado tipo "Apellidos, Nombres"
 * en sus dos partes. Heurístico, no infalible — por eso el resultado
 * siempre pasa por una vista previa editable antes de confirmar la carga.
 */
export function dividirNombreApellido(
  campoCompleto: string,
  nombreConocido?: string
): EstudianteExtraido {
  const texto = campoCompleto.trim().replace(/\s+/g, " ");

  if (texto.includes(",")) {
    const [apellido, nombre] = texto.split(",", 2).map((parte) => parte.trim());
    return { nombre: nombre ?? "", apellido: apellido ?? "" };
  }

  if (nombreConocido && nombreConocido.trim()) {
    const nombreNormalizado = normalizarTexto(nombreConocido);
    const textoNormalizado = normalizarTexto(texto);
    if (nombreNormalizado && textoNormalizado.endsWith(nombreNormalizado)) {
      const apellido = texto.slice(0, texto.length - nombreConocido.trim().length).trim();
      return { nombre: nombreConocido.trim(), apellido };
    }
  }

  // Sin coma ni nombre conocido por separado — el heurístico más frágil
  // de los tres, por lo que la vista previa editable sigue siendo la red
  // de seguridad final. Corrección 16/09/2026: probado contra un listado
  // real de colegio, la versión anterior (siempre "última palabra =
  // nombre") solo acertaba en el caso de 2-3 palabras; en el caso más
  // común del archivo real (4 palabras, ~60% de las filas: dos apellidos
  // + dos nombres, la convención de registro civil en Colombia) dejaba
  // fuera el primer nombre por completo (ej. "Aguilera Lugo Mateo
  // Jeronimo" quedaba como apellido="Aguilera Lugo Mateo", nombre="Jeronimo",
  // en vez de apellido="Aguilera Lugo", nombre="Mateo Jeronimo"). Ahora,
  // con 3 o más palabras se asume que las primeras dos son los apellidos
  // (igual que en el caso de 3 palabras, donde ya acertaba) y el resto es
  // el nombre completo; con exactamente 2 palabras se sigue asumiendo
  // 1 apellido + 1 nombre, como antes.
  const partes = texto.split(" ").filter((parte) => parte.length > 0);
  if (partes.length < 2) {
    return { nombre: texto, apellido: "" };
  }
  if (partes.length === 2) {
    return { nombre: partes[1], apellido: partes[0] };
  }
  const apellido = partes.slice(0, 2).join(" ");
  const nombre = partes.slice(2).join(" ");
  return { nombre, apellido };
}

/**
 * Parsea una hoja ya convertida a un arreglo de filas de texto — recibe
 * los datos ya leídos (en vez de un archivo) para que esta función sea
 * pura y se pueda probar sin depender de un Excel real. Ignora todo lo
 * que aparezca antes de la fila de encabezado real (criterio 5) y corta
 * el listado si vuelve a aparecer otra fila de encabezado (otra
 * tabla/hoja mal separada).
 */
export function parsearFilasHoja(filas: string[][], nombreHoja: string): GrupoExtraido | null {
  const indiceEncabezado = filas.findIndex((fila) => esFilaDeEncabezado(fila));

  if (indiceEncabezado === -1) {
    return null;
  }

  const encabezado = filas[indiceEncabezado];
  const columnas = detectarColumnas(encabezado);
  const filasDatos = filas.slice(indiceEncabezado + 1);

  const estudiantes: EstudianteExtraido[] = [];

  for (const fila of filasDatos) {
    if (fila.every((celda) => normalizarTexto(celda ?? "") === "")) {
      continue; // fila vacía de separación — no cierra el listado
    }

    if (esFilaDeEncabezado(fila)) {
      break; // otra tabla empieza aquí, este grupo termina
    }

    let estudiante: EstudianteExtraido | null = null;

    if (columnas.indiceNombre !== null && columnas.indiceApellido !== null) {
      const nombre = (fila[columnas.indiceNombre] ?? "").trim();
      const apellido = (fila[columnas.indiceApellido] ?? "").trim();
      if (nombre || apellido) {
        estudiante = { nombre, apellido };
      }
    } else if (columnas.indiceNombreCompleto !== null) {
      const campo = (fila[columnas.indiceNombreCompleto] ?? "").trim();
      const nombreSeparado =
        columnas.indiceNombre !== null ? (fila[columnas.indiceNombre] ?? "").trim() : undefined;
      if (campo) {
        estudiante = dividirNombreApellido(campo, nombreSeparado);
      }
    }

    if (estudiante && (estudiante.nombre || estudiante.apellido)) {
      estudiantes.push(estudiante);
    }
  }

  if (estudiantes.length === 0) {
    return null;
  }

  return { nombre: nombreHoja, estudiantes };
}

/**
 * US29, criterio 3: un mismo archivo Excel puede traer varias hojas (una
 * por grado/grupo) — se parsea cada una por separado, sin asumir que solo
 * hay una.
 */
export function parsearWorkbookExcel(buffer: Buffer): ResultadoParseo {
  const libro = XLSX.read(buffer, { type: "buffer" });
  const grupos: GrupoExtraido[] = [];
  const advertencias: string[] = [];

  for (const nombreHoja of libro.SheetNames) {
    const hoja = libro.Sheets[nombreHoja];
    const filas = XLSX.utils.sheet_to_json(hoja, {
      header: 1,
      raw: false,
      defval: "",
    }) as string[][];

    const grupo = parsearFilasHoja(filas, nombreHoja);

    if (grupo) {
      grupos.push(grupo);
    } else {
      advertencias.push(
        `La hoja "${nombreHoja}" no tiene columnas de nombre/apellido reconocibles — se ignoró.`
      );
    }
  }

  return { grupos, advertencias };
}

const PATRON_TITULO_GRUPO = /listado de estudiantes\s*[:\-]?\s*(.+)/i;
const PATRON_LINEA_ESTUDIANTE = /^\s*\d+\s*[.\-)]?\s+(.+)$/;
const PALABRAS_ENCABEZADO_INSTITUCIONAL = [
  "nit",
  "codigo dane",
  "ano lectivo",
  "director de grupo",
  "institucion educativa",
  "colegio",
  "resolucion",
];

/**
 * US29, criterio 1 (ruta de respaldo para PDF): interpreta texto plano
 * extraído de un PDF con el patrón "número + resto de la línea = nombre".
 * Más frágil que el parseo de Excel (sin columnas reales de por medio),
 * por lo que la vista previa editable es aún más importante como red de
 * seguridad para este formato.
 */
export function parsearTextoPdf(texto: string): ResultadoParseo {
  const lineas = texto
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0);

  const grupos: GrupoExtraido[] = [];
  let grupoActual: GrupoExtraido | null = null;

  for (const linea of lineas) {
    const tituloGrupo = linea.match(PATRON_TITULO_GRUPO);
    if (tituloGrupo) {
      if (grupoActual && grupoActual.estudiantes.length > 0) {
        grupos.push(grupoActual);
      }
      grupoActual = { nombre: tituloGrupo[1].trim(), estudiantes: [] };
      continue;
    }

    const normalizada = normalizarTexto(linea);
    if (PALABRAS_ENCABEZADO_INSTITUCIONAL.some((palabra) => normalizada.includes(palabra))) {
      continue; // encabezado institucional — nunca se lee (criterio 5)
    }

    const lineaEstudiante = linea.match(PATRON_LINEA_ESTUDIANTE);
    if (lineaEstudiante) {
      if (!grupoActual) {
        grupoActual = { nombre: "Sin grupo", estudiantes: [] };
      }
      grupoActual.estudiantes.push(dividirNombreApellido(lineaEstudiante[1]));
    }
  }

  if (grupoActual && grupoActual.estudiantes.length > 0) {
    grupos.push(grupoActual);
  }

  const advertencias: string[] = [];
  if (grupos.length === 0) {
    advertencias.push(
      "No se reconoció ninguna fila de estudiante en el PDF (formato de texto no reconocido)."
    );
  }

  return { grupos, advertencias };
}

/**
 * Punto de entrada único (US29): decide el formato por la extensión del
 * archivo y despacha al parser correspondiente. Excel es la ruta
 * preferida (criterio 1) porque llega con columnas ya estructuradas; PDF
 * es la ruta de respaldo, más frágil.
 */
export async function parsearArchivoEstudiantes(
  buffer: Buffer,
  nombreArchivo: string
): Promise<ResultadoParseo> {
  const extension = nombreArchivo.split(".").pop()?.toLowerCase();

  if (extension === "xlsx" || extension === "xls") {
    return parsearWorkbookExcel(buffer);
  }

  if (extension === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const resultado = await parser.getText();
    return parsearTextoPdf(resultado.text);
  }

  return {
    grupos: [],
    advertencias: [
      `Formato de archivo no reconocido ("${nombreArchivo}") — se aceptan Excel (.xls, .xlsx) o PDF.`,
    ],
  };
}
