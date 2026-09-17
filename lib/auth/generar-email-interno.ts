import { normalizarTexto } from "@/lib/parse-student-file";

/**
 * US29, criterio 7: ni el Excel ni el PDF del colegio traen un email real
 * (son estudiantes menores de edad, normalmente sin correo propio), así
 * que se genera uno interno — no es una dirección real, solo sirve como
 * usuario de login, mostrado junto con la contraseña temporal en el
 * resumen final de la carga (igual que ya pasa con las cuentas nuevas de
 * US02/US06/OP01). Si el candidato colisiona con un email ya existente
 * (comprobado con `emailYaUsado`, para no repetir la consulta a la base de
 * datos por cada estudiante), se agrega un sufijo numérico creciente hasta
 * encontrar uno libre.
 */
export function generarEmailInterno(
  nombre: string,
  apellido: string,
  emailYaUsado: (candidato: string) => boolean
): string {
  const base =
    `${normalizarTexto(nombre)}.${normalizarTexto(apellido)}`
      .replace(/[^a-z0-9.]/g, "")
      .replace(/\.+/g, ".")
      .replace(/^\.|\.$/g, "") || "estudiante";

  let candidato = `${base}@estudiantes-lms.local`;
  let sufijo = 1;

  while (emailYaUsado(candidato)) {
    sufijo += 1;
    candidato = `${base}${sufijo}@estudiantes-lms.local`;
  }

  return candidato;
}
