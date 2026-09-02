"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createSyncedUser } from "@/lib/supabase/sync-user";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";

const crearTutorSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio"),
  apellido: z.string().trim().min(2, "El apellido es obligatorio"),
  email: z.string().trim().email("Correo inválido"),
});

function generarPasswordTemporal() {
  return randomBytes(9).toString("base64url");
}

export async function crearTutor(formData: FormData) {
  // 1. Verificar que quien llama sea un Administrador autenticado.
  // Sin este chequeo, cualquiera que conozca la ruta del formulario
  // (o manipule la petición directamente) podría crear tutores.
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

  if (!solicitante || solicitante.rol !== Rol.ADMINISTRADOR) {
    return {
      success: false as const,
      error: "Solo un administrador puede crear tutores.",
    };
  }

  // 2. Validar los datos del formulario en el servidor.
  const parsed = crearTutorSchema.safeParse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  // 3. Crear el tutor, sincronizado con Supabase Auth (US21).
  const passwordTemporal = generarPasswordTemporal();

  try {
    await createSyncedUser({
      ...parsed.data,
      password: passwordTemporal,
      rol: Rol.TUTOR,
      // Épica Multi-docente (US24/US26): el Tutor nuevo hereda el espacio
      // del Administrador que lo crea — así un segundo espacio (US25) nunca
      // termina mezclando sus Tutores con los del espacio de Fabio Aguirre.
      espacioId: solicitante.espacioId ?? undefined,
    });
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "No se pudo crear el tutor.",
    };
  }

  // 4. Refrescar el listado para que el tutor nuevo aparezca sin recargar la página.
  revalidatePath("/admin/tutores");

  return { success: true as const, passwordTemporal };
}
