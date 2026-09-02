"use server";

import { z } from "zod";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { resetSyncedUserPassword } from "@/lib/supabase/sync-user";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import { usuarioVisibleEnEspacio } from "@/lib/espacio-scope";

const resetearPasswordSchema = z.object({
  usuarioId: z.string().trim().min(1, "Falta el usuario."),
});

function generarPasswordTemporal() {
  return randomBytes(9).toString("base64url");
}

type ResultadoResetearPassword =
  | { success: true; passwordTemporal: string }
  | { success: false; error: string };

/**
 * La contraseña de un usuario nunca se puede "ver" después de creada —
 * Supabase Auth solo guarda su hash, nunca el valor original, igual que
 * cualquier sistema de autenticación serio — así que la única forma real de
 * ayudar a alguien que la olvidó es generarle una nueva. La mayoría de
 * Estudiantes son niños y olvidan su contraseña con frecuencia, sin una
 * forma realista de usar un flujo de "olvidé mi contraseña" por correo
 * propio; esta acción le da a un Administrador o Tutor una forma de
 * restablecerla, visible una sola vez en pantalla para copiarla y dársela
 * al estudiante — mismo criterio que ya se usa al crear una cuenta nueva
 * (US02/US06). Mismo modelo de permisos que `actualizarEmailUsuario` /
 * `actualizarNombreUsuario`: un Administrador puede restablecer la
 * contraseña de cualquier usuario, un Tutor solo la de Estudiantes.
 */
export async function resetearPasswordUsuario(
  formData: FormData
): Promise<ResultadoResetearPassword> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado." };
  }

  const solicitante = await prisma.users.findUnique({
    where: { authId: user.id },
  });

  if (
    !solicitante ||
    (solicitante.rol !== Rol.ADMINISTRADOR && solicitante.rol !== Rol.TUTOR)
  ) {
    return { success: false, error: "No tienes permiso para hacer esto." };
  }

  const parsed = resetearPasswordSchema.safeParse({
    usuarioId: formData.get("usuarioId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const usuarioObjetivo = await prisma.users.findUnique({
    where: { id: parsed.data.usuarioId },
  });

  if (!usuarioObjetivo) {
    return { success: false, error: "El usuario no existe." };
  }

  // Épica Multi-docente (US24): además del rol, el usuario objetivo debe
  // ser visible desde el espacio de quien solicita el restablecimiento —
  // un Administrador/Tutor de un espacio no puede resetear la contraseña
  // de nadie de otro espacio aunque conozca su ID directamente.
  if (!solicitante.espacioId) {
    return { success: false, error: "No tienes permiso para hacer esto." };
  }

  const puedeEditarRol =
    solicitante.rol === Rol.ADMINISTRADOR
      ? true
      : usuarioObjetivo.rol === Rol.ESTUDIANTE;

  const puedeEditar =
    puedeEditarRol && (await usuarioVisibleEnEspacio(usuarioObjetivo, solicitante.espacioId));

  if (!puedeEditar) {
    return {
      success: false,
      error: "No tienes permiso para editar este usuario.",
    };
  }

  if (!usuarioObjetivo.authId) {
    return {
      success: false,
      error: "El usuario no tiene una cuenta de acceso vinculada.",
    };
  }

  const passwordTemporal = generarPasswordTemporal();

  try {
    await resetSyncedUserPassword({
      authId: usuarioObjetivo.authId,
      nuevoPassword: passwordTemporal,
    });
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "No se pudo restablecer la contraseña.",
    };
  }

  return { success: true, passwordTemporal };
}
