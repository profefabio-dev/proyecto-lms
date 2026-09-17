"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSyncedUser } from "@/lib/supabase/sync-user";
import { generarPasswordTemporal } from "@/lib/auth/generar-password-temporal";
import { generarEmailInterno } from "@/lib/auth/generar-email-interno";
import { parsearArchivoEstudiantes, type GrupoExtraido } from "@/lib/parse-student-file";

const EXTENSIONES_ACEPTADAS = ["xlsx", "xls", "pdf"];

type ResultadoPrevisualizar =
  | { success: true; grupos: GrupoExtraido[]; advertencias: string[] }
  | { success: false; error: string };

/**
 * US29, paso 1: recibe el archivo (Excel o PDF) subido por un
 * Administrador o Tutor y lo parsea, sin crear todavía ningún usuario —
 * el resultado se muestra como vista previa editable en el cliente
 * (criterio 6) antes de que se llame a `confirmarCargaEstudiantes`.
 */
export async function previsualizarCargaEstudiantes(
  _prevState: ResultadoPrevisualizar | null,
  formData: FormData
): Promise<ResultadoPrevisualizar> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (
    !usuarioActual ||
    (usuarioActual.rol !== Rol.TUTOR && usuarioActual.rol !== Rol.ADMINISTRADOR)
  ) {
    return {
      success: false,
      error: "Solo un administrador o tutor puede cargar un listado de estudiantes.",
    };
  }

  const archivo = formData.get("archivo");

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { success: false, error: "Selecciona un archivo Excel (.xls, .xlsx) o PDF." };
  }

  const extension = archivo.name.split(".").pop()?.toLowerCase();

  if (!extension || !EXTENSIONES_ACEPTADAS.includes(extension)) {
    return {
      success: false,
      error: "Formato no reconocido. Sube un archivo Excel (.xls, .xlsx) o PDF.",
    };
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());

  let resultado;
  try {
    resultado = await parsearArchivoEstudiantes(buffer, archivo.name);
  } catch (error) {
    console.error("Error parseando archivo de estudiantes:", error);
    return {
      success: false,
      error: "No se pudo leer el archivo. Verifica que no esté dañado o protegido.",
    };
  }

  if (resultado.grupos.length === 0) {
    return {
      success: false,
      error: resultado.advertencias[0] ?? "No se detectó ningún estudiante en el archivo.",
    };
  }

  return { success: true, grupos: resultado.grupos, advertencias: resultado.advertencias };
}

const estudianteEditadoSchema = z.object({
  nombre: z.string().min(1),
  apellido: z.string().min(1),
  grupo: z.string().optional(),
});

const confirmarSchema = z.object({
  estudiantes: z
    .array(estudianteEditadoSchema)
    .min(1, "No hay estudiantes seleccionados para crear."),
  courseId: z.string().optional(),
});

export type ResultadoConfirmar =
  | {
      success: true;
      creados: { nombre: string; apellido: string; email: string; passwordTemporal: string }[];
      omitidos: { nombre: string; apellido: string; motivo: string }[];
      inscritos: number;
    }
  | { success: false; error: string };

/**
 * US29, paso 2: recibe el listado ya revisado/editado por el usuario en la
 * vista previa y crea los estudiantes de verdad, uno por uno — "todo o
 * nada por fila" (criterio 9, igual que US28 para un lote de usuarios):
 * si `createSyncedUser` falla para un estudiante puntual, esa fila se
 * omite y el resto del lote sigue su curso, en vez de abortar la carga
 * completa por un solo error.
 */
export async function confirmarCargaEstudiantes(
  _prevState: ResultadoConfirmar | null,
  formData: FormData
): Promise<ResultadoConfirmar> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (
    !usuarioActual ||
    (usuarioActual.rol !== Rol.TUTOR && usuarioActual.rol !== Rol.ADMINISTRADOR)
  ) {
    return {
      success: false,
      error: "Solo un administrador o tutor puede cargar un listado de estudiantes.",
    };
  }

  let estudiantesCrudo: unknown;
  try {
    estudiantesCrudo = JSON.parse(String(formData.get("estudiantes") ?? "[]"));
  } catch {
    return {
      success: false,
      error: "Los datos del listado llegaron corruptos. Vuelve a cargar el archivo.",
    };
  }

  const parsed = confirmarSchema.safeParse({
    estudiantes: estudiantesCrudo,
    courseId: formData.get("courseId") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { estudiantes, courseId } = parsed.data;

  // Solo un Tutor puede pedir inscripción inmediata a uno de sus propios
  // cursos (criterio 10) — mismo chequeo de propiedad que asignarEstudiantes
  // (US11). Un Administrador siempre crea sin inscribir.
  let curso: { id: string } | null = null;
  if (courseId && usuarioActual.rol === Rol.TUTOR) {
    const cursoEncontrado = await prisma.courses.findUnique({ where: { id: courseId } });
    if (!cursoEncontrado || cursoEncontrado.tutorId !== usuarioActual.id) {
      return { success: false, error: "Este curso no existe o no te pertenece." };
    }
    curso = { id: cursoEncontrado.id };
  }

  const creados: {
    nombre: string;
    apellido: string;
    email: string;
    passwordTemporal: string;
  }[] = [];
  const idsCreados: string[] = [];
  const omitidos: { nombre: string; apellido: string; motivo: string }[] = [];

  // Se consulta una sola vez el conjunto de emails ya usados en toda la
  // base de datos, y se va ampliando en memoria a medida que se crean
  // estudiantes de este mismo lote — evita tanto colisionar con una
  // cuenta ya existente como que dos filas del propio archivo terminen
  // generando el mismo email interno.
  const emailsExistentes = new Set(
    (await prisma.users.findMany({ select: { email: true } })).map((usuario) =>
      usuario.email.toLowerCase()
    )
  );

  for (const fila of estudiantes) {
    const nombre = fila.nombre.trim();
    const apellido = fila.apellido.trim();

    if (!nombre || !apellido) {
      omitidos.push({ nombre, apellido, motivo: "Falta nombre o apellido." });
      continue;
    }

    // Criterio 8: duplicado por nombre+apellido, sin distinguir mayúsculas.
    const yaExiste = await prisma.users.findFirst({
      where: {
        rol: Rol.ESTUDIANTE,
        nombre: { equals: nombre, mode: "insensitive" },
        apellido: { equals: apellido, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (yaExiste) {
      omitidos.push({
        nombre,
        apellido,
        motivo: "Ya existe un estudiante con este nombre y apellido.",
      });
      continue;
    }

    const email = generarEmailInterno(nombre, apellido, (candidato) =>
      emailsExistentes.has(candidato.toLowerCase())
    );
    emailsExistentes.add(email.toLowerCase());

    const passwordTemporal = generarPasswordTemporal();

    try {
      const nuevoUsuario = await createSyncedUser({
        nombre,
        apellido,
        email,
        password: passwordTemporal,
        rol: Rol.ESTUDIANTE,
        // 16/09/2026: se persiste el grado/grupo detectado en la hoja de
        // origen del Excel (antes se usaba solo para mostrarlo en la
        // vista previa y para inscripción, sin guardarse) — pedido del
        // docente para poder distinguir estudiantes por grupo en
        // "Asignar estudiantes" (ver `lib/group-color.ts`).
        grado: fila.grupo || undefined,
      });
      creados.push({ nombre, apellido, email, passwordTemporal });
      idsCreados.push(nuevoUsuario.id);
    } catch (error) {
      console.error("Error creando estudiante en carga masiva:", error);
      omitidos.push({
        nombre,
        apellido,
        motivo: "No se pudo crear la cuenta (falló la sincronización con Auth).",
      });
    }
  }

  let inscritos = 0;

  if (curso && idsCreados.length > 0) {
    try {
      await prisma.courseUsers.createMany({
        data: idsCreados.map((userId) => ({ courseId: curso!.id, userId })),
      });
      inscritos = idsCreados.length;
    } catch (error) {
      // Los estudiantes ya quedaron creados de todas formas — un fallo de
      // inscripción no revierte la creación, solo se informa como 0
      // inscritos para que el Tutor los asigne a mano después.
      console.error("Error inscribiendo estudiantes de la carga masiva:", error);
    }
  }

  revalidatePath("/tutor/estudiantes");
  revalidatePath("/admin/usuarios");
  if (curso) {
    revalidatePath(`/tutor/cursos/${curso.id}`);
  }

  return {
    success: true,
    creados,
    omitidos,
    inscritos,
  };
}
