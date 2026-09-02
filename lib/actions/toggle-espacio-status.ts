"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setSyncedUserActiveState } from "@/lib/supabase/sync-user";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";

const alternarEstadoEspacioSchema = z.object({
  espacioId: z.string().trim().min(1, "Falta el espacio."),
  accion: z.enum(["desactivar", "reactivar"]),
});

type ResultadoAlternarEspacio = { success: true } | { success: false; error: string };

/**
 * US28 — un Super Administrador desactiva o reactiva un espacio completo
 * (por ejemplo, cuando un docente deja la plataforma). Revoca/restaura el
 * acceso de TODOS los Administradores y Tutores de ese espacio a la vez,
 * reutilizando `setSyncedUserActiveState` (US23) usuario por usuario. Los
 * Estudiantes nunca pertenecen a un espacio propio (US24 — son una cuenta
 * única y compartida), así que esta acción no los toca en absoluto: si
 * tenían cursos en este espacio, simplemente dejan de verlos (el filtro de
 * US24 ya excluye los cursos de un espacio inactivo por herencia del
 * Tutor), pero su cuenta y su acceso a otros espacios quedan intactos.
 *
 * Compensación: se recorren los usuarios uno por uno; si falla la
 * sincronización de alguno a mitad de la lista, se revierten (en el
 * sentido contrario) los que ya se habían sincronizado antes de ese fallo
 * y **no** se toca el `estado` del Espacio — para no dejarlo a medias
 * (algunos usuarios cambiados, otros no, pero el espacio marcado como si
 * el cambio se hubiera completado). Mismo criterio de "todo o nada" que
 * usa el resto de operaciones de este proyecto que tocan Auth y la base de
 * datos a la vez (`createSyncedUser`, `crearEspacio`).
 */
export async function alternarEstadoEspacio(formData: FormData): Promise<ResultadoAlternarEspacio> {
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

  const parsed = alternarEstadoEspacioSchema.safeParse({
    espacioId: formData.get("espacioId"),
    accion: formData.get("accion"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { espacioId, accion } = parsed.data;

  const espacio = await prisma.espacios.findUnique({ where: { id: espacioId } });

  if (!espacio) {
    return { success: false, error: "El espacio no existe." };
  }

  const activar = accion === "reactivar";

  const usuariosDelEspacio = await prisma.users.findMany({
    where: { espacioId, rol: { in: [Rol.ADMINISTRADOR, Rol.TUTOR] } },
  });

  const sincronizados: typeof usuariosDelEspacio = [];

  try {
    for (const usuario of usuariosDelEspacio) {
      await setSyncedUserActiveState({
        usuarioId: usuario.id,
        authId: usuario.authId,
        activar,
      });
      sincronizados.push(usuario);
    }
  } catch (error) {
    // Revertir a los que ya se habían sincronizado, para no dejar el
    // espacio con algunos usuarios cambiados y otros no.
    for (const usuario of sincronizados) {
      await setSyncedUserActiveState({
        usuarioId: usuario.id,
        authId: usuario.authId,
        activar: !activar,
      }).catch(() => {
        // Mejor esfuerzo: si ni siquiera la reversión funciona, seguimos
        // con el resto — el Super Administrador ya recibe el error abajo.
      });
    }
    return {
      success: false,
      error:
        error instanceof Error
          ? `No se pudo actualizar a todos los usuarios del espacio: ${error.message}`
          : "No se pudo actualizar a todos los usuarios del espacio.",
    };
  }

  await prisma.espacios.update({
    where: { id: espacioId },
    data: { estado: activar ? "ACTIVO" : "INACTIVO" },
  });

  revalidatePath("/superadmin");

  return { success: true };
}
