"use server";

import { prisma } from "@/lib/prisma";

/**
 * Se llama desde el formulario de login, sin sesión, cuando
 * `signInWithPassword` de Supabase Auth falla — para poder mostrar "tu
 * cuenta fue desactivada" en vez del genérico "credenciales incorrectas"
 * cuando corresponde. Antes de este ajuste, un Estudiante o Tutor
 * desactivado por el Administrador (US20/US23) veía el mismo mensaje que
 * si hubiera escrito mal la contraseña, y no tenía forma de saber que la
 * causa real era la desactivación.
 *
 * Deliberadamente NO distingue "el email no existe" de "el email existe y
 * está activo" — ambos casos devuelven `false` — para no confirmar a un
 * tercero no autenticado qué correos están registrados en el sistema; solo
 * revela el caso "existe y está desactivado", que es el único que necesita
 * un mensaje distinto.
 */
export async function correoPerteneceACuentaDesactivada(email: string): Promise<boolean> {
  const emailNormalizado = email.trim();

  if (!emailNormalizado) {
    return false;
  }

  const usuario = await prisma.users.findUnique({
    where: { email: emailNormalizado },
    select: { estado: true },
  });

  return usuario?.estado === "INACTIVO";
}
