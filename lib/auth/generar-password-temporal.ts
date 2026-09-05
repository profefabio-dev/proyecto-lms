import { randomBytes } from "node:crypto";

/**
 * Genera una contraseña temporal aleatoria, usada en todos los flujos de alta
 * o restablecimiento de credenciales (US02/US06, OP01/OP02/OP03, US25):
 * se muestra una sola vez en pantalla/consola y el usuario debe cambiarla o
 * anotarla, ya que no queda guardada en ningún lado más que como hash en
 * Supabase Auth.
 *
 * Antes esta misma función (o su expresión equivalente en línea) estaba
 * copiada de forma idéntica en seis archivos distintos
 * (`create-tutor.ts`, `create-student.ts`, `create-espacio.ts`,
 * `reset-user-password.ts`, `reset-espacio-admin-password.ts` y
 * `scripts/reset-admin-passwords.ts`) — se consolida aquí para que un
 * eventual cambio de longitud/formato no dependa de recordar actualizar los
 * seis lugares.
 */
export function generarPasswordTemporal(): string {
  return randomBytes(9).toString("base64url");
}
