"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  COOKIE_MODO_LECTURA,
  SEGUNDOS_COOKIE_MODO_LECTURA,
  leerModoLectura,
} from "@/lib/reading-mode";

/**
 * US56-A — guarda el modo de lectura que eligió el estudiante (28/11/2026).
 *
 * **Es la única acción del proyecto que no comprueba la sesión, y es a
 * propósito.** Todas las demás empiezan con "hay sesión / es tal rol / es
 * dueño de esto" porque tocan datos de alguien. Esta no toca datos: escribe
 * una cookie de gusto visual en el navegador de quien la pidió. Pedir sesión
 * no protegería nada —no hay nada que leer ni que escribir— y en cambio haría
 * fallar el interruptor en la vista previa del Tutor y en cualquier pantalla
 * pública que algún día quiera usarlo. Queda escrito para que no se "corrija"
 * agregándole una comprobación que no hace falta.
 *
 * `httpOnly` aunque nadie la lea desde el navegador: quien la usa es el
 * servidor, al armar la lección. `sameSite: "lax"` para que sobreviva a
 * llegar desde un enlace externo al curso.
 */
export async function cambiarModoLectura(formData: FormData) {
  const modo = leerModoLectura(formData.get("modo"));

  const galletas = await cookies();
  galletas.set({
    name: COOKIE_MODO_LECTURA,
    value: modo,
    path: "/",
    maxAge: SEGUNDOS_COOKIE_MODO_LECTURA,
    httpOnly: true,
    sameSite: "lax",
  });

  // La ruta NO viene del formulario: un campo oculto con la ruta a
  // revalidar es un campo que cualquiera puede cambiar para invalidar el
  // caché de otra pantalla. El reproductor de lecciones vive siempre bajo
  // `/estudiante`, así que se revalida ese árbol y no hace falta confiar en
  // nada que llegue de afuera.
  revalidatePath("/estudiante", "layout");
}
