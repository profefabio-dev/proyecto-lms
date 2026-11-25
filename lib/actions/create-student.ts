"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSyncedUser } from "@/lib/supabase/sync-user";
import { generarPasswordTemporal } from "@/lib/auth/generar-password-temporal";

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

  // US50 (25/11/2026): la cuenta queda marcada con el espacio del Tutor que
  // la crea. Sin eso, el estudiante no pertenecía a ningún espacio hasta que
  // alguien lo inscribiera en un curso, así que desaparecía de la lista del
  // propio Tutor que lo acababa de crear. Un Tutor sin espacio no debería
  // existir (la migración de la épica Multi-docente se lo asignó a todos),
  // pero si apareciera, mejor no crear una cuenta que nadie va a poder ver.
  if (!usuarioActual.espacioId) {
    return { success: false, error: "Tu cuenta no está asociada a ningún espacio." };
  }

  const parsed = crearEstudianteSchema.safeParse({
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const passwordTemporal = generarPasswordTemporal();

  try {
    await createSyncedUser({
      ...parsed.data,
      password: passwordTemporal,
      rol: Rol.ESTUDIANTE,
      espacioOrigenId: usuarioActual.espacioId,
    });
  } catch (error) {
    console.error("Error creando estudiante:", error);
    return { success: false, error: "No se pudo crear el estudiante. Intenta de nuevo." };
  }

  revalidatePath("/tutor/estudiantes");

  return { success: true, passwordTemporal };
}