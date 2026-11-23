"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US49 — las dos acciones del Super Administrador sobre el catálogo
 * (24/11/2026).
 *
 * **Son las únicas de todo el proyecto que escriben sobre un curso ajeno**,
 * y por eso están juntas en un archivo aparte en vez de mezcladas con las
 * acciones del Tutor: quien lea el código debe ver de un vistazo cuál es la
 * excepción a la regla de que solo el dueño toca su curso.
 *
 * La excepción está acotada a dos banderas. Ninguna de las dos toca el
 * contenido, las notas ni los estudiantes del curso.
 */

const esquema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
});

type Resultado = { success: true; mensaje: string } | { success: false; error: string };

async function superAdministradorActual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const usuario = await prisma.users.findUnique({ where: { authId: user.id } });

  return usuario && usuario.rol === Rol.SUPERADMIN ? usuario : null;
}

/**
 * Pone o quita el sello de verificado. Es lo que un docente ve como
 * "revisado por la plataforma" en el catálogo, y lo que le da sentido a
 * esforzarse: su material puede llegar ahí.
 */
export async function alternarCursoVerificado(
  _prevState: Resultado | null,
  formData: FormData
): Promise<Resultado> {
  if (!(await superAdministradorActual())) {
    return { success: false, error: "No tienes permiso para esta acción." };
  }

  const parsed = esquema.safeParse({ courseId: formData.get("courseId") });

  if (!parsed.success) {
    return { success: false, error: "Datos inválidos." };
  }

  const curso = await prisma.courses.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, verificado: true, compartible: true },
  });

  if (!curso) {
    return { success: false, error: "No encontramos ese curso." };
  }

  // Verificar algo que no está en el catálogo no significa nada, y dejaría
  // un sello puesto que nadie puso a prueba si algún día se comparte.
  if (!curso.compartible && !curso.verificado) {
    return {
      success: false,
      error: "Solo se puede verificar un curso que su autor haya compartido.",
    };
  }

  try {
    const actualizado = await prisma.courses.update({
      where: { id: curso.id },
      data: { verificado: !curso.verificado },
    });

    revalidatePath("/tutor/catalogo");
    revalidatePath(`/tutor/catalogo/${curso.id}`);
    revalidatePath("/superadmin");

    return {
      success: true,
      mensaje: actualizado.verificado
        ? "Curso verificado: ahora lleva el sello de la plataforma."
        : "Se quitó el sello de verificado.",
    };
  } catch (error) {
    console.error("Error al verificar el curso:", error);
    return { success: false, error: "No se pudo guardar el cambio. Intenta de nuevo." };
  }
}

/**
 * Saca un curso del catálogo de inmediato.
 *
 * **Esto no es por calidad, es por seguridad.** La plataforma es para
 * menores de edad: un curso con contenido inapropiado tiene que poder
 * retirarse en treinta segundos y a cualquier hora, no esperando a que
 * alguien vacíe una cola de revisión. Por eso existe esta acción y no una
 * aprobación previa.
 *
 * Retirar **no borra nada**: el curso sigue siendo de su autor, con sus
 * estudiantes y su contenido intactos. Solo deja de ofrecerse a otros
 * docentes. Y el autor puede volver a compartirlo, porque esto es una
 * medida inmediata, no una sanción — si hace falta algo más, se habla con
 * la persona.
 */
export async function retirarCursoDelCatalogo(
  _prevState: Resultado | null,
  formData: FormData
): Promise<Resultado> {
  if (!(await superAdministradorActual())) {
    return { success: false, error: "No tienes permiso para esta acción." };
  }

  const parsed = esquema.safeParse({ courseId: formData.get("courseId") });

  if (!parsed.success) {
    return { success: false, error: "Datos inválidos." };
  }

  const curso = await prisma.courses.findUnique({
    where: { id: parsed.data.courseId },
    select: { id: true, titulo: true, compartible: true },
  });

  if (!curso) {
    return { success: false, error: "No encontramos ese curso." };
  }

  if (!curso.compartible) {
    return { success: false, error: "Ese curso ya no está en el catálogo." };
  }

  try {
    // Se quita también el sello: lo que se retira no puede seguir llevando
    // el respaldo de la plataforma.
    await prisma.courses.update({
      where: { id: curso.id },
      data: { compartible: false, verificado: false },
    });

    revalidatePath("/tutor/catalogo");
    revalidatePath(`/tutor/catalogo/${curso.id}`);
    revalidatePath("/superadmin");

    return {
      success: true,
      mensaje: `"${curso.titulo}" se retiró del catálogo. Su autor conserva el curso y sus estudiantes.`,
    };
  } catch (error) {
    console.error("Error al retirar el curso del catálogo:", error);
    return { success: false, error: "No se pudo retirar el curso. Intenta de nuevo." };
  }
}
