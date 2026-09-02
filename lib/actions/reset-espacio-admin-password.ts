"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resetSyncedUserPassword } from "@/lib/supabase/sync-user";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import { randomBytes } from "node:crypto";

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
 * Un Super Administrador no tenía, hasta ahora, ninguna forma de ayudar a
 * un docente que perdió la contraseña de su Administrador — solo un
 * Administrador/Tutor puede usar `resetearPasswordUsuario` (OP01), y por
 * diseño ninguno de los dos alcanza a un Administrador de OTRO espacio (ni
 * el suyo propio, si es el único y quedó bloqueado). Se detectó como un
 * vacío real el 02/09/2026, cuando el docente perdió las contraseñas de
 * sus Administradores en un bloc de notas: para el suyo propio existía un
 * script de emergencia (`scripts/reset-admin-passwords.ts`, OP02), pero
 * probar el Administrador de un espacio de prueba (US28) requería lo
 * mismo desde la interfaz, sin depender de una terminal.
 *
 * Acotado a propósito: solo alcanza a usuarios con rol ADMINISTRADOR (no
 * Tutor ni Estudiante) — un Super Administrador opera sobre espacios y su
 * primer Administrador (mismo alcance que US25), nunca sobre la gestión
 * interna de un espacio, que sigue siendo responsabilidad exclusiva de su
 * propio Administrador.
 */
export async function restablecerPasswordAdministradorEspacio(
  formData: FormData
): Promise<ResultadoResetearPassword> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado." };
  }

  const solicitante = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!solicitante || solicitante.rol !== Rol.SUPERADMIN) {
    return { success: false, error: "Solo un Super Administrador puede hacer esto." };
  }

  const parsed = resetearPasswordSchema.safeParse({
    usuarioId: formData.get("usuarioId"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const usuarioObjetivo = await prisma.users.findUnique({
    where: { id: parsed.data.usuarioId },
  });

  if (!usuarioObjetivo) {
    return { success: false, error: "El usuario no existe." };
  }

  if (usuarioObjetivo.rol !== Rol.ADMINISTRADOR) {
    return {
      success: false,
      error: "Solo se puede restablecer la contraseña de un Administrador desde aquí.",
    };
  }

  if (!usuarioObjetivo.authId) {
    return { success: false, error: "El usuario no tiene una cuenta de acceso vinculada." };
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
      error: error instanceof Error ? error.message : "No se pudo restablecer la contraseña.",
    };
  }

  return { success: true, passwordTemporal };
}
