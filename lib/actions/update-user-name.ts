"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";

const actualizarNombreSchema = z.object({
  usuarioId: z.string().trim().min(1, "Falta el usuario a editar."),
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  apellido: z.string().trim().min(2, "El apellido debe tener al menos 2 caracteres."),
});

/**
 * Permite corregir el nombre/apellido de un usuario (errores de tipeo al
 * registrarlo, por ejemplo). Mismo modelo de permisos que
 * `actualizarEmailUsuario` (US22): un Administrador puede editar a
 * cualquier usuario, un Tutor solo a Estudiantes. No toca Supabase Auth —
 * nombre/apellido solo viven en la tabla Users, a diferencia del email.
 */
export async function actualizarNombreUsuario(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false as const, error: "No autenticado." };
  }

  const solicitante = await prisma.users.findUnique({
    where: { authId: user.id },
  });

  if (
    !solicitante ||
    (solicitante.rol !== Rol.ADMINISTRADOR && solicitante.rol !== Rol.TUTOR)
  ) {
    return {
      success: false as const,
      error: "No tienes permiso para editar usuarios.",
    };
  }

  const parsed = actualizarNombreSchema.safeParse({
    usuarioId: formData.get("usuarioId"),
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
  });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const usuarioObjetivo = await prisma.users.findUnique({
    where: { id: parsed.data.usuarioId },
  });

  if (!usuarioObjetivo) {
    return { success: false as const, error: "El usuario no existe." };
  }

  const puedeEditar =
    solicitante.rol === Rol.ADMINISTRADOR
      ? true
      : usuarioObjetivo.rol === Rol.ESTUDIANTE;

  if (!puedeEditar) {
    return {
      success: false as const,
      error: "No tienes permiso para editar este usuario.",
    };
  }

  if (
    parsed.data.nombre === usuarioObjetivo.nombre &&
    parsed.data.apellido === usuarioObjetivo.apellido
  ) {
    return {
      success: false as const,
      error: "No hay cambios para guardar.",
    };
  }

  try {
    await prisma.users.update({
      where: { id: usuarioObjetivo.id },
      data: { nombre: parsed.data.nombre, apellido: parsed.data.apellido },
    });
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "No se pudo actualizar el usuario.",
    };
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/tutores");
  revalidatePath("/tutor/estudiantes");

  return { success: true as const };
}
