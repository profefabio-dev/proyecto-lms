import { supabaseAdmin } from "./admin";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";

interface CreateSyncedUserInput {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rol: Rol;
}

export async function createSyncedUser(input: CreateSyncedUserInput) {
  const { email, password, nombre, apellido, rol } = input;

  // 1. Crear el usuario en Supabase Auth (ahí es donde se valida el login)
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // lo marca como verificado, ya que lo crea un Admin/Tutor de confianza
    });

  if (authError || !authData.user) {
    throw new Error(
      `No se pudo crear el usuario en Supabase Auth: ${authError?.message}`
    );
  }

  // 2. Crear el registro correspondiente en la tabla Users (Prisma)
  try {
    const nuevoUsuario = await prisma.users.create({
      data: {
        authId: authData.user.id,
        email,
        nombre,
        apellido,
        rol,
      },
    });

    return nuevoUsuario;
  } catch (dbError) {
    // 3. Compensación: si falla el guardado en la base de datos,
    // eliminamos el usuario que ya se había creado en Auth,
    // para no dejar un usuario "fantasma" que existe en un lado y no en el otro.
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new Error(
      `No se pudo crear el usuario en la base de datos, se revirtió el alta en Auth: ${dbError}`
    );
  }
}

interface UpdateSyncedUserEmailInput {
  usuarioId: string;
  authId: string | null;
  emailActual: string;
  nuevoEmail: string;
}

/**
 * US22 — mantiene sincronizado el email entre la tabla Users y Supabase
 * Auth cuando un Admin/Tutor edita el correo de un usuario.
 *
 * Orden de operaciones (igual que createSyncedUser, US21): primero se
 * actualiza en Auth (que es lo que de verdad controla el login). Si eso
 * falla, nunca se toca la base de datos, así que no hay nada que
 * revertir. Si Auth se actualiza bien pero falla el guardado en Users,
 * se revierte el email en Auth al valor anterior para que ninguna de
 * las dos fuentes quede desincronizada.
 */
export async function updateSyncedUserEmail(input: UpdateSyncedUserEmailInput) {
  const { usuarioId, authId, emailActual, nuevoEmail } = input;

  if (!authId) {
    throw new Error(
      "El usuario no tiene una cuenta de Supabase Auth vinculada; no se puede sincronizar el email."
    );
  }

  if (nuevoEmail === emailActual) {
    // Nada que sincronizar.
    return;
  }

  // 1. Actualizar primero en Supabase Auth.
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    authId,
    { email: nuevoEmail }
  );

  if (authError) {
    throw new Error(
      `No se pudo actualizar el email en Supabase Auth: ${authError.message}`
    );
  }

  // 2. Actualizar en la base de datos (Prisma).
  try {
    await prisma.users.update({
      where: { id: usuarioId },
      data: { email: nuevoEmail },
    });
  } catch (dbError) {
    // 3. Compensación: revertir el email en Auth al valor anterior.
    await supabaseAdmin.auth.admin.updateUserById(authId, {
      email: emailActual,
    });
    throw new Error(
      `No se pudo actualizar el email en la base de datos, se revirtió el cambio en Auth: ${dbError}`
    );
  }
}