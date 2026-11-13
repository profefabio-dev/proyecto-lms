/**
 * Paquete 3 de interfaz (2026-11-12): textos legibles para mostrar el rol y
 * el estado de un usuario. Antes las tablas de Admin/Tutor imprimían el valor
 * crudo de la base de datos ("ESTUDIANTE", "ACTIVO") en mayúsculas sostenidas,
 * que se lee como un código interno y no como parte de la interfaz.
 */
const ETIQUETA_ROL: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  TUTOR: "Tutor",
  ESTUDIANTE: "Estudiante",
  SUPERADMIN: "Super Administrador",
};

const ETIQUETA_ESTADO: Record<string, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Desactivado",
};

export function etiquetaRol(rol: string): string {
  return ETIQUETA_ROL[rol] ?? rol;
}

export function etiquetaEstado(estado: string): string {
  return ETIQUETA_ESTADO[estado] ?? estado;
}
