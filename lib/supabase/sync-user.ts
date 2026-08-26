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