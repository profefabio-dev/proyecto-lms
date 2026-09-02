"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setSyncedUserActiveState } from "@/lib/supabase/sync-user";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import { usuarioVisibleEnEspacio } from "@/lib/espacio-scope";

const alternarEstadoSchema = z.object({
  usuarioId: z.string().trim().min(1, "Falta el usuario."),
  accion: z.enum(["desactivar", "reactivar"]),
});

/**
 * US20 — un Administrador desactiva o reactiva un usuario. La revocación
 * real en Supabase Auth (US23) la hace `setSyncedUserActiveState`; esta
 * Server Action solo valida sesión, rol y los datos del formulario, igual
 * que el resto de acciones de este archivo.
 */
export async function alternarEstadoUsuario(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false as const, error: "No autenticado." };
  }

  const solicitante = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!solicitante || solicitante.rol !== Rol.ADMINISTRADOR) {
    return { success: false as const, error: "No tienes permiso para hacer esto." };
  }

  const parsed = alternarEstadoSchema.safeParse({
    usuarioId: formData.get("usuarioId"),
    accion: formData.get("accion"),
  });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const { usuarioId, accion } = parsed.data;

  // Evita que un Administrador se bloquee a sí mismo por accidente y se
  // quede sin forma de revertirlo desde la interfaz.
  if (usuarioId === solicitante.id) {
    return { success: false as const, error: "No puedes desactivar tu propia cuenta." };
  }

  const usuarioObjetivo = await prisma.users.findUnique({ where: { id: usuarioId } });

  if (!usuarioObjetivo) {
    return { success: false as const, error: "El usuario no existe." };
  }

  // Épica Multi-docente (US24): un Administrador solo puede desactivar/
  // reactivar usuarios visibles desde su propio espacio — no a cualquier
  // usuario de la plataforma aunque conozca su ID directamente.
  if (
    !solicitante.espacioId ||
    !(await usuarioVisibleEnEspacio(usuarioObjetivo, solicitante.espacioId))
  ) {
    return { success: false as const, error: "No tienes permiso para editar este usuario." };
  }

  try {
    await setSyncedUserActiveState({
      usuarioId: usuarioObjetivo.id,
      authId: usuarioObjetivo.authId,
      activar: accion === "reactivar",
    });
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "No se pudo actualizar el estado.",
    };
  }

  revalidatePath("/admin/usuarios");

  return { success: true as const };
}
