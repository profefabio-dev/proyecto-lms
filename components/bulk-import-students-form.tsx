"use client";

import { useActionState, useState } from "react";
import {
  previsualizarCargaEstudiantes,
  confirmarCargaEstudiantes,
  type ResultadoConfirmar,
} from "@/lib/actions/bulk-import-students";
import { Button } from "@/components/ui/button";
import { colorDeGrupo } from "@/lib/group-color";

interface FilaEditable {
  incluido: boolean;
  nombre: string;
  apellido: string;
  grupo: string;
}

type Paso = "subir" | "revisar" | "resultado";

type ResultadoFinal = Extract<ResultadoConfirmar, { success: true }>;

// Corrección de UX (16/09/2026): confirmar un archivo grande (~190
// estudiantes en la prueba real del docente) toma cerca de dos minutos,
// porque cada estudiante requiere su propia llamada a la API de Supabase
// Auth — no hay forma de paralelizarlas sin perder el criterio "todo o
// nada por fila". Antes se enviaba todo en una sola llamada a la Server
// Action y el botón solo decía "Creando...", sin ningún indicio de avance
// durante esos dos minutos — el docente reportó que "pareciera que no
// estuviera haciendose nada". Ahora el cliente parte la lista en lotes
// pequeños y llama a `confirmarCargaEstudiantes` una vez por lote
// (Server Actions se pueden invocar directamente como funciones normales,
// no solo desde un `<form action={...}>`), actualizando el progreso entre
// cada lote. La verificación de duplicados (por nombre+apellido y por
// email) sigue siendo correcta lote a lote: cada llamada consulta la
// base de datos de nuevo, y como los lotes se esperan uno por uno (nunca
// en paralelo), los estudiantes ya creados en un lote anterior ya están
// guardados cuando se revisa el siguiente.
const TAMANO_LOTE = 15;

// Corrección de UX (16/09/2026), pedida por el docente: la vista previa
// mostraba las ~190 filas de golpe en una sola tabla plana — "muy fea",
// difícil de revisar. Cada fila ya trae el nombre de la hoja de origen del
// Excel en `grupo` (una hoja = un grado, ej. "6A"), así que agrupar por ahí
// es literalmente agrupar por grado sin inventar ningún dato nuevo. Se
// reutiliza el mismo patrón visual ya usado para las secciones de un curso
// en `app/tutor/cursos/[courseId]/page.tsx` (bloques `<details>`/`<summary>`
// colapsables, uno por grupo), agregando un botón de "seleccionar
// todos/ninguno" por grado para no tener que marcar de a una las 190 filas.
function agruparFilasPorGrupo(filas: FilaEditable[]): { grupo: string; indices: number[] }[] {
  const orden: string[] = [];
  const indicesPorGrupo = new Map<string, number[]>();
  filas.forEach((fila, indice) => {
    if (!indicesPorGrupo.has(fila.grupo)) {
      indicesPorGrupo.set(fila.grupo, []);
      orden.push(fila.grupo);
    }
    indicesPorGrupo.get(fila.grupo)!.push(indice);
  });
  return orden.map((grupo) => ({ grupo, indices: indicesPorGrupo.get(grupo)! }));
}

/**
 * US29 — formulario de carga masiva de estudiantes desde un Excel o PDF.
 * Flujo en tres pasos, controlado por `paso` (no derivado directamente de
 * los resultados de `useActionState`, para poder "empezar de nuevo" sin
 * quedar atrapado en el resultado de la carga anterior):
 *
 * 1. "subir": el usuario sube el archivo, se llama a
 *    `previsualizarCargaEstudiantes` (Server Action).
 * 2. "revisar": vista previa editable de los estudiantes detectados
 *    (criterio 6), agrupada por grado (ver `agruparFilasPorGrupo` arriba)
 *    — se puede excluir cualquier fila con su casilla (o un grupo entero
 *    de una vez), corregir nombre/apellido a mano, y elegir un curso para
 *    inscribir de una vez (solo Tutor, criterio 10). Al confirmar, se
 *    procesa por lotes (ver `TAMANO_LOTE` arriba) mostrando el avance.
 * 3. "resultado": resumen de creados/omitidos y las credenciales
 *    generadas (criterio 11).
 */
export function BulkImportStudentsForm({
  cursos,
}: {
  cursos?: { id: string; titulo: string }[];
}) {
  const [previsualizacion, accionPrevisualizar, previsualizando] = useActionState(
    previsualizarCargaEstudiantes,
    null
  );
  const [paso, setPaso] = useState<Paso>("subir");
  const [filas, setFilas] = useState<FilaEditable[]>([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [progreso, setProgreso] = useState<{ procesados: number; total: number } | null>(null);
  const [errorConfirmar, setErrorConfirmar] = useState<string | null>(null);
  const [resultadoFinal, setResultadoFinal] = useState<ResultadoFinal | null>(null);

  // Ajuste de estado durante el render (no en un efecto) al detectar un
  // resultado nuevo de `useActionState`: siguiendo el patrón recomendado por
  // React para "adjusting state when a prop changes" — evita el render
  // extra que causaría un `useEffect` con `setState` síncrono.
  const [ultimaPrevisualizacion, setUltimaPrevisualizacion] = useState(previsualizacion);
  if (previsualizacion !== ultimaPrevisualizacion) {
    setUltimaPrevisualizacion(previsualizacion);
    if (previsualizacion?.success) {
      setFilas(
        previsualizacion.grupos.flatMap((grupo) =>
          grupo.estudiantes.map((estudiante) => ({
            incluido: true,
            nombre: estudiante.nombre,
            apellido: estudiante.apellido,
            grupo: grupo.nombre,
          }))
        )
      );
      setPaso("revisar");
    }
  }

  function actualizarFila(indice: number, cambios: Partial<FilaEditable>) {
    setFilas((actual) => actual.map((fila, i) => (i === indice ? { ...fila, ...cambios } : fila)));
  }

  function alternarGrupo(indices: number[], incluido: boolean) {
    setFilas((actual) =>
      actual.map((fila, i) => (indices.includes(i) ? { ...fila, incluido } : fila))
    );
  }

  function empezarDeNuevo() {
    setFilas([]);
    setCursoSeleccionado("");
    setProgreso(null);
    setErrorConfirmar(null);
    setResultadoFinal(null);
    setPaso("subir");
  }

  async function confirmarCarga() {
    const seleccionadas = filas
      .filter((fila) => fila.incluido)
      .map(({ nombre, apellido, grupo }) => ({ nombre, apellido, grupo }));

    if (seleccionadas.length === 0) {
      return;
    }

    setConfirmando(true);
    setErrorConfirmar(null);
    setProgreso({ procesados: 0, total: seleccionadas.length });

    const creados: ResultadoFinal["creados"] = [];
    const omitidos: ResultadoFinal["omitidos"] = [];
    let inscritos = 0;

    for (let inicio = 0; inicio < seleccionadas.length; inicio += TAMANO_LOTE) {
      const lote = seleccionadas.slice(inicio, inicio + TAMANO_LOTE);
      const formData = new FormData();
      formData.set("estudiantes", JSON.stringify(lote));
      if (cursoSeleccionado) {
        formData.set("courseId", cursoSeleccionado);
      }

      const resultadoLote = await confirmarCargaEstudiantes(null, formData);

      if (!resultadoLote.success) {
        setConfirmando(false);
        setErrorConfirmar(resultadoLote.error);
        return;
      }

      creados.push(...resultadoLote.creados);
      omitidos.push(...resultadoLote.omitidos);
      inscritos += resultadoLote.inscritos;
      setProgreso({
        procesados: Math.min(inicio + TAMANO_LOTE, seleccionadas.length),
        total: seleccionadas.length,
      });
    }

    setConfirmando(false);
    setResultadoFinal({ success: true, creados, omitidos, inscritos });
    setPaso("resultado");
  }

  if (paso === "resultado" && resultadoFinal) {
    return (
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="font-semibold">
          Carga completada: {resultadoFinal.creados.length} estudiante(s) creado(s)
          {resultadoFinal.inscritos > 0
            ? `, ${resultadoFinal.inscritos} inscrito(s) en el curso`
            : ""}
          .
        </p>

        {resultadoFinal.creados.length > 0 && (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="py-1.5 pl-3 pr-2">Nombre</th>
                  <th className="py-1.5 pr-2">Email</th>
                  <th className="py-1.5 pr-3">Contraseña temporal</th>
                </tr>
              </thead>
              <tbody>
                {resultadoFinal.creados.map((estudiante) => (
                  <tr key={estudiante.email} className="border-b last:border-b-0">
                    <td className="py-1.5 pl-3 pr-2">
                      {estudiante.nombre} {estudiante.apellido}
                    </td>
                    <td className="py-1.5 pr-2 break-all">{estudiante.email}</td>
                    <td className="py-1.5 pr-3 font-mono">{estudiante.passwordTemporal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {resultadoFinal.omitidos.length > 0 && (
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">
              {resultadoFinal.omitidos.length} fila(s) omitida(s):
            </p>
            <ul className="list-inside list-disc text-muted-foreground">
              {resultadoFinal.omitidos.map((omitido, indice) => (
                <li key={indice}>
                  {omitido.nombre} {omitido.apellido} — {omitido.motivo}
                </li>
              ))}
            </ul>
          </div>
        )}

        {resultadoFinal.creados.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Guarda estas credenciales ahora — no se vuelven a mostrar.
          </p>
        )}

        <Button type="button" variant="outline" size="sm" onClick={empezarDeNuevo}>
          Cargar otro archivo
        </Button>
      </div>
    );
  }

  if (paso === "revisar") {
    const seleccionados = filas.filter((fila) => fila.incluido).length;
    const grupos = agruparFilasPorGrupo(filas);

    return (
      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          void confirmarCarga();
        }}
        className="space-y-3 rounded-lg border p-4"
      >
        {cursos && cursos.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="bulk-import-course">
              Inscribir de una vez en el curso (opcional)
            </label>
            <select
              id="bulk-import-course"
              value={cursoSeleccionado}
              onChange={(evento) => setCursoSeleccionado(evento.target.value)}
              disabled={confirmando}
              className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
            >
              <option value="">Sin inscribir (crear solamente)</option>
              {cursos.map((curso) => (
                <option key={curso.id} value={curso.id}>
                  {curso.titulo}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Revisa y corrige antes de confirmar — es la única oportunidad de arreglar un nombre mal
          separado o descartar una fila que no corresponda. Los estudiantes están agrupados por el
          grado detectado en cada hoja del archivo.
        </p>

        <div className="max-h-[32rem] space-y-3 overflow-auto rounded-md border bg-muted/10 p-3">
          {grupos.map(({ grupo, indices }) => {
            const seleccionadosGrupo = indices.filter((indice) => filas[indice].incluido).length;
            const todosSeleccionados = seleccionadosGrupo === indices.length;
            // 16/09/2026, pedido por el docente: línea de color a la
            // izquierda para distinguir cada grado de un vistazo — mismo
            // color estable en cualquier pantalla que agrupe por grado
            // (ver `lib/group-color.ts`).
            const color = colorDeGrupo(grupo);

            return (
              <details
                key={grupo || "sin-grado"}
                open
                className={`space-y-2 rounded-lg border border-l-4 bg-card p-3 ${color.borde}`}
              >
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                  <span>
                    {grupo || "Sin grado"}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({seleccionadosGrupo}/{indices.length} seleccionado
                      {indices.length === 1 ? "" : "s"})
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={confirmando}
                    onClick={(evento) => {
                      // Evita que el clic también abra/cierre el <details>,
                      // ya que el botón vive dentro de su <summary>.
                      evento.preventDefault();
                      evento.stopPropagation();
                      alternarGrupo(indices, !todosSeleccionados);
                    }}
                  >
                    {todosSeleccionados ? "Deseleccionar todos" : "Seleccionar todos"}
                  </Button>
                </summary>

                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1.5 pl-2 pr-2"></th>
                      <th className="py-1.5 pr-2">Nombre</th>
                      <th className="py-1.5 pr-2">Apellido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indices.map((indice) => {
                      const fila = filas[indice];
                      return (
                        <tr key={indice} className="border-b last:border-b-0">
                          <td className="py-1 pl-2 pr-2">
                            <input
                              type="checkbox"
                              aria-label={`Incluir a ${fila.nombre} ${fila.apellido}`}
                              checked={fila.incluido}
                              disabled={confirmando}
                              onChange={(event) =>
                                actualizarFila(indice, { incluido: event.target.checked })
                              }
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <input
                              aria-label="Nombre"
                              className="w-full rounded border border-input bg-transparent px-1.5 py-0.5"
                              value={fila.nombre}
                              disabled={confirmando}
                              onChange={(event) =>
                                actualizarFila(indice, { nombre: event.target.value })
                              }
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <input
                              aria-label="Apellido"
                              className="w-full rounded border border-input bg-transparent px-1.5 py-0.5"
                              value={fila.apellido}
                              disabled={confirmando}
                              onChange={(event) =>
                                actualizarFila(indice, { apellido: event.target.value })
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </details>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={confirmando || seleccionados === 0}>
            {confirmando
              ? `Creando ${progreso?.procesados ?? 0} de ${progreso?.total ?? seleccionados}...`
              : `Confirmar y crear ${seleccionados} estudiante(s)`}
          </Button>
          <Button type="button" variant="outline" onClick={empezarDeNuevo} disabled={confirmando}>
            Cancelar
          </Button>
        </div>

        {confirmando && (
          <p className="text-xs text-muted-foreground">
            Puede tardar unos minutos con archivos grandes — no cierres ni recargues esta página.
          </p>
        )}

        {errorConfirmar && (
          <p role="alert" className="text-sm text-red-600">
            {errorConfirmar}
          </p>
        )}
      </form>
    );
  }

  return (
    <form action={accionPrevisualizar} className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="bulk-import-file">
          Cargar listado de estudiantes (Excel o PDF)
        </label>
        {/* Corrección de UX (16/09/2026): el `<input type="file">` sin
            estilo se veía como texto plano ("Seleccionar archivo / Ningún
            archivo seleccionado"), sin ningún indicio visual de que fuera
            clicable — el docente lo reportó como "no es claro y es
            enredado". Las clases `file:*` de Tailwind dan estilo a la
            parte de botón nativa del input (mismos tokens que
            `components/ui/button.tsx`: `bg-primary`/`text-primary-foreground`,
            radio de 6px), sin reemplazar el input por un componente nuevo. */}
        <input
          id="bulk-import-file"
          type="file"
          name="archivo"
          accept=".xls,.xlsx,.pdf"
          required
          className="block w-full cursor-pointer text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-[6px] file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/80"
        />
        <p className="text-xs text-muted-foreground">
          Se extraen solo nombre, apellido y grado/grupo — cualquier otra columna (número de fila,
          foto, etc.) y el encabezado institucional del colegio se ignoran automáticamente.
        </p>
      </div>
      <Button type="submit" disabled={previsualizando}>
        {previsualizando ? "Leyendo archivo..." : "Ver vista previa"}
      </Button>
      {previsualizacion && !previsualizacion.success && (
        <p role="alert" className="text-sm text-red-600">
          {previsualizacion.error}
        </p>
      )}
    </form>
  );
}
