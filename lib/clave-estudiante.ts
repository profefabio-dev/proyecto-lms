/**
 * US34: clave con la que se compara un estudiante del archivo de carga
 * masiva contra los que ya existen en la plataforma — nombre y apellido sin
 * espacios sobrantes y sin distinguir mayúsculas, el mismo criterio que ya
 * usa `confirmarCargaEstudiantes` (US29, criterio 8) al consultar la base
 * de datos con `mode: "insensitive"`.
 *
 * Vive en su propio archivo porque la usan tanto la Server Action (para
 * armar la lista de existentes) como el formulario del cliente (para volver
 * a calcularla cuando el Tutor corrige un nombre a mano en la vista previa),
 * y un archivo `"use server"` solo puede exportar funciones asíncronas.
 */
export function claveEstudiante(nombre: string, apellido: string): string {
  return `${nombre.trim().toLowerCase()}|${apellido.trim().toLowerCase()}`;
}
