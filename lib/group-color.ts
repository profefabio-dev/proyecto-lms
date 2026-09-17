/**
 * Utilidad compartida (16/09/2026, pedida por el docente) para distinguir
 * visualmente un grado/grupo con un color estable: el mismo texto de
 * grupo (ej. "6A") siempre cae en el mismo color, en cualquier pantalla
 * que lo use — la vista previa de la carga masiva (US29) y la lista de
 * "Asignar estudiantes" — sin depender del orden en que aparezcan ni de
 * qué otros grupos estén presentes en ese momento.
 *
 * Paleta fija de 8 colores, asignados por un hash simple del texto (nunca
 * se generan colores nuevos ni se ciclan al azar). Se evitan a propósito
 * los colores que ya tienen un significado propio en el proyecto
 * (`components/ui/badge.tsx`: verde = éxito, ámbar = advertencia, rojo =
 * destructivo) para no mezclar esa semántica con una simple distinción de
 * grupo.
 */
const PALETA_GRUPOS = [
  {
    borde: "border-l-blue-400 dark:border-l-blue-500",
    insignia: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  },
  {
    borde: "border-l-violet-400 dark:border-l-violet-500",
    insignia: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-400",
  },
  {
    borde: "border-l-cyan-400 dark:border-l-cyan-500",
    insignia: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-400",
  },
  {
    borde: "border-l-teal-400 dark:border-l-teal-500",
    insignia: "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-400",
  },
  {
    borde: "border-l-orange-400 dark:border-l-orange-500",
    insignia: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-400",
  },
  {
    borde: "border-l-pink-400 dark:border-l-pink-500",
    insignia: "bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-400",
  },
  {
    borde: "border-l-indigo-400 dark:border-l-indigo-500",
    insignia: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-400",
  },
  {
    borde: "border-l-lime-400 dark:border-l-lime-500",
    insignia: "bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-400",
  },
] as const;

const SIN_GRUPO = {
  borde: "border-l-transparent",
  insignia: "bg-muted text-muted-foreground",
} as const;

export function colorDeGrupo(grupo: string | null | undefined): {
  borde: string;
  insignia: string;
} {
  const texto = (grupo ?? "").trim();
  if (!texto) {
    return SIN_GRUPO;
  }
  let hash = 0;
  for (let indice = 0; indice < texto.length; indice++) {
    hash = (hash * 31 + texto.charCodeAt(indice)) >>> 0;
  }
  return PALETA_GRUPOS[hash % PALETA_GRUPOS.length];
}
