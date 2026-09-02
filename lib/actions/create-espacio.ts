"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createSyncedUser } from "@/lib/supabase/sync-user";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";

const crearEspacioSchema = z.object({
  nombreEspacio: z.string().trim().min(2, "El nombre del espacio es obligatorio"),
  nombre: z.string().trim().min(2, "El nombre del administrador es obligatorio"),
  apellido: z.string().trim().min(2, "El apellido del administrador es obligatorio"),
  email: z.string().trim().email("Correo inválido"),
});

function generarPasswordTemporal() {
  return randomBytes(9).toString("base64url");
}

type ResultadoCrearEspacio =
  | { success: true; passwordTemporal: string }
  | { success: false; error: string };

/**
 * US25 — un Super Administrador da de alta un nuevo espacio de docente
 * (institución), junto con su primer Administrador. Ese Administrador
 * queda acotado a gestionar únicamente su propio espacio, igual que
 * cualquier otro Administrador (US24) — nunca puede ver ni gestionar nada
 * del espacio de Fabio Aguirre ni de ningún otro.
 *
 * El alta del Administrador se sincroniza con Supabase Auth igual que
 * `crearTutor`/`crearEstudiante` (US21), con el mismo patrón de contraseña
 * temporal generada en el servidor y mostrada una sola vez.
 *
 * Orden de operaciones y compensación: el Espacio se crea primero (una
 * operación puramente local que no puede fallar por un servicio externo).
 * Si después falla la creación del Administrador —`createSyncedUser` ya
 * revierte por su cuenta cualquier problema entre Auth y la tabla Users—
 * el Espacio recién creado se elimina, para no dejar un espacio "fantasma"
 * sin ningún Administrador que pueda entrar a gestionarlo.
 */
export async function crearEspacio(formData: FormData): Promise<ResultadoCrearEspacio> {
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

  if (!solicitante || solicitante.rol !== Rol.SUPERADMIN) {
    return {
      success: false,
      error: "Solo un Super Administrador puede crear espacios.",
    };
  }

  const parsed = crearEspacioSchema.safeParse({
    nombreEspacio: formData.get("nombreEspacio"),
    nombre: formData.get("nombre"),
    apellido: formData.get("apellido"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const { nombreEspacio, nombre, apellido, email } = parsed.data;

  // 1. Crear el Espacio.
  const espacio = await prisma.espacios.create({
    data: { nombre: nombreEspacio },
  });

  const passwordTemporal = generarPasswordTemporal();

  // 2. Crear el primer Administrador del espacio, sincronizado con
  // Supabase Auth.
  try {
    await createSyncedUser({
      email,
      password: passwordTemporal,
      nombre,
      apellido,
      rol: Rol.ADMINISTRADOR,
      espacioId: espacio.id,
    });
  } catch (error) {
    // 3. Compensación: sin Administrador, este Espacio quedaría huérfano
    // (nadie podría gestionarlo) — se elimina.
    await prisma.espacios.delete({ where: { id: espacio.id } });
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo crear el administrador del espacio.",
    };
  }

  revalidatePath("/superadmin");

  return { success: true, passwordTemporal };
}
