"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateSyncedUserEmail } from "@/lib/supabase/sync-user";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import { usuarioVisibleEnEspacio } from "@/lib/espacio-scope";

const actualizarEmailSchema = z.object({
  usuarioId: z.string().trim().min(1, "Falta el usuario a editar."),
  nuevoEmail: z.string().trim().email("Correo inválido."),
});

export async function actualizarEmailUsuario(formData: FormData) {
  // 1. Verificar que quien llama sea un Administrador o Tutor autenticado.
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

  // 2. Validar los datos del formulario en el servidor.
  const parsed = actualizarEmailSchema.safeParse({
    usuarioId: formData.get("usuarioId"),
    nuevoEmail: formData.get("nuevoEmail"),
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

  // 3. Autorización: un Tutor solo puede editar el email de Estudiantes;
  // un Administrador puede editar Tutores y Estudiantes. Además (US24), el
  // usuario objetivo debe ser visible desde el espacio de quien solicita el
  // cambio — un Administrador/Tutor de un espacio no puede editar a nadie
  // de otro espacio aunque conozca su ID directamente.
  if (!solicitante.espacioId) {
    return {
      success: false as const,
      error: "No tienes permiso para editar usuarios.",
    };
  }

  const puedeEditarRol =
    solicitante.rol === Rol.ADMINISTRADOR
      ? true
      : usuarioObjetivo.rol === Rol.ESTUDIANTE;

  const puedeEditar =
    puedeEditarRol && (await usuarioVisibleEnEspacio(usuarioObjetivo, solicitante.espacioId));

  if (!puedeEditar) {
    return {
      success: false as const,
      error: "No tienes permiso para editar este usuario.",
    };
  }

  if (parsed.data.nuevoEmail === usuarioObjetivo.email) {
    return {
      success: false as const,
      error: "El nuevo correo es igual al actual.",
    };
  }

  // 4. Actualizar, sincronizado con Supabase Auth (US22).
  try {
    await updateSyncedUserEmail({
      usuarioId: usuarioObjetivo.id,
      authId: usuarioObjetivo.authId,
      emailActual: usuarioObjetivo.email,
      nuevoEmail: parsed.data.nuevoEmail,
    });
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "No se pudo actualizar el email.",
    };
  }

  // 5. Refrescar los listados donde puede aparecer este usuario.
  revalidatePath("/admin/usuarios");
  revalidatePath("/tutor/estudiantes");

  return { success: true as const };
}
