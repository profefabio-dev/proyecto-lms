"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSyncedUser } from "@/lib/supabase/sync-user";

const crearEstudianteSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  apellido: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
});

type ResultadoCrearEstudiante =
  | { success: true; passwordTemporal: string }
  | { success: false; error: string };

export async function crearEstudiante(
  _prevState: ResultadoCrearEstudiante | null,
  formData: FormData
): Promise<ResultadoCrearEstudiante> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede crear estudiantes." };
  }

  const parsed = crearEstudianteSchema.safeParse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const passwordTemporal = randomBytes(9).toString("base64url");

  try {
    await createSyncedUser({
      ...parsed.data,
      password: passwordTemporal,
      rol: Rol.ESTUDIANTE,
    });
  } catch (error) {
    console.error("Error creando estudiante:", error);
    return { success: false, error: "No se pudo crear el estudiante. Intenta de nuevo." };
  }

  revalidatePath("/tutor/estudiantes");

  return { success: true, passwordTemporal };
}