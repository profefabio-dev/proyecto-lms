import { supabaseAdmin } from "./admin";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import type { EstadoUsuario } from "@prisma/client";

interface CreateSyncedUserInput {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  /**
   * Épica Multi-docente (Backlog.md, US24/US25): obligatorio en la práctica
   * para ADMINISTRADOR/TUTOR (cada llamador debe pasar su propio espacio o
   * el del espacio que está creando), ausente para SUPERADMIN y ESTUDIANTE.
   * Opcional aquí a propósito para no romper la firma de esta función en
   * los dos casos donde no aplica.
   */
  espacioId?: string;
}

export async function createSyncedUser(input: CreateSyncedUserInput) {
  const { email, password, nombre, apellido, rol, espacioId } = input;

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
        espacioId,
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

interface ResetSyncedUserPasswordInput {
  authId: string;
  nuevoPassword: string;
}

/**
 * Recuperación de contraseña asistida por Admin/Tutor: la mayoría de
 * Estudiantes son niños que olvidan su contraseña con frecuencia y no
 * tienen una forma realista de usar un flujo de "olvidé mi contraseña" por
 * correo propio. Esta función genera una contraseña nueva directamente en
 * Supabase Auth (la Admin API no permite leer ni "ver" la contraseña
 * actual — Supabase nunca la guarda en texto plano, solo su hash — así que
 * la única operación posible es reemplazarla por una nueva). Solo toca
 * Auth: a diferencia de `updateSyncedUserEmail`/`setSyncedUserActiveState`,
 * no hay ningún campo de contraseña en la tabla `Users` que actualizar
 * después, así que no hace falta ningún patrón de compensación.
 */
export async function resetSyncedUserPassword(
  input: ResetSyncedUserPasswordInput
): Promise<void> {
  const { authId, nuevoPassword } = input;

  const { error } = await supabaseAdmin.auth.admin.updateUserById(authId, {
    password: nuevoPassword,
  });

  if (error) {
    throw new Error(
      `No se pudo restablecer la contraseña en Supabase Auth: ${error.message}`
    );
  }
}

interface SetSyncedUserActiveStateInput {
  usuarioId: string;
  authId: string | null;
  activar: boolean;
}

// ~100 años: la Admin API de Supabase no tiene un "ban permanente" real,
// así que se usa una duración muy larga en vez de una fecha de expiración.
const DURACION_BLOQUEO_PERMANENTE = "876000h";

/**
 * US20/US23 — desactiva o reactiva el acceso de un usuario, sincronizando
 * Supabase Auth (lo que de verdad controla el login) con el campo `estado`
 * de la tabla Users (lo que se muestra en la interfaz de Admin y lo que
 * usa `app/dashboard/page.tsx` como segunda capa de defensa).
 *
 * Mismo orden que `updateSyncedUserEmail` arriba: primero se actualiza en
 * Auth; si falla, no se toca la base de datos. Si Auth se actualiza bien
 * pero falla el guardado en Users, se revierte el cambio en Auth para no
 * dejar las dos fuentes desincronizadas.
 *
 * **Límite conocido de la Admin API de Supabase:** `ban_duration` bloquea
 * inicios de sesión y refrescos de token nuevos de inmediato, pero no hay
 * una forma de invalidar por la fuerza un access token que ya se emitió
 * antes de que expire por sí solo — Supabase no expone esa operación. Por
 * eso `app/dashboard/page.tsx` también valida `estado === "ACTIVO"` en
 * cada inicio de sesión: cierra esa ventana sin depender de que el token
 * ya haya expirado.
 */
export async function setSyncedUserActiveState(
  input: SetSyncedUserActiveStateInput
): Promise<void> {
  const { usuarioId, authId, activar } = input;

  if (!authId) {
    throw new Error(
      "El usuario no tiene una cuenta de Supabase Auth vinculada; no se puede sincronizar su estado."
    );
  }

  const nuevoEstado: EstadoUsuario = activar ? "ACTIVO" : "INACTIVO";
  const nuevaDuracion = activar ? "none" : DURACION_BLOQUEO_PERMANENTE;

  // 1. Actualizar primero en Supabase Auth.
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(authId, {
    ban_duration: nuevaDuracion,
  });

  if (authError) {
    throw new Error(`No se pudo actualizar el acceso en Supabase Auth: ${authError.message}`);
  }

  // 2. Actualizar en la base de datos (Prisma).
  try {
    await prisma.users.update({
      where: { id: usuarioId },
      data: { estado: nuevoEstado },
    });
  } catch (dbError) {
    // 3. Compensación: revertir el cambio en Auth.
    await supabaseAdmin.auth.admin.updateUserById(authId, {
      ban_duration: activar ? DURACION_BLOQUEO_PERMANENTE : "none",
    });
    throw new Error(
      `No se pudo actualizar el estado en la base de datos, se revirtió el cambio en Auth: ${dbError}`
    );
  }
}
