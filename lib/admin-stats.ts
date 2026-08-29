import type { Rol } from "@prisma/client";

/**
 * US04: el Administrador consulta indicadores generales (usuarios por rol y
 * cursos activos) en su dashboard.
 *
 * `prisma.users.groupBy({ by: ["rol"], _count: { _all: true } })` solo
 * devuelve una fila por cada rol que de verdad tiene al menos un usuario —
 * si todavía no existe ningún Estudiante, por ejemplo, esa fila simplemente
 * no aparece en el resultado. Esta función normaliza eso a un objeto con
 * los tres roles siempre presentes (en 0 si no hay usuarios de ese rol),
 * para que la UI no tenga que manejar el caso de "rol ausente" por separado.
 */
export type ConteoPorRol = Record<Rol, number>;

const ROLES: readonly Rol[] = ["ADMINISTRADOR", "TUTOR", "ESTUDIANTE"];

export function construirConteoPorRol(
  agrupado: { rol: Rol; _count: { _all: number } }[]
): ConteoPorRol {
  const conteo = Object.fromEntries(ROLES.map((rol) => [rol, 0])) as ConteoPorRol;

  for (const grupo of agrupado) {
    conteo[grupo.rol] = grupo._count._all;
  }

  return conteo;
}
