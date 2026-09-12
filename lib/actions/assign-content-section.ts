"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * US30: el Tutor asigna un contenido a una sección, o lo deja "Sin sección"
 * (valor `""` del `<select>` — ver `SectionAssignSelect`). Un contenido sin
 * sección se comporta exactamente igual que antes de US30: aparece siempre,
 * fuera de cualquier agrupación.
 */
const asignarContenidoASeccionSchema = z.object({
  contentId: z.string().min(1, "Contenido inválido"),
  seccionId: z.string(),
});

type ResultadoAsignarContenidoASeccion = { success: true } | { success: false; error: string };

export async function asignarContenidoASeccion(
  _prevState: ResultadoAsignarContenidoASeccion | null,
  formData: FormData
): Promise<ResultadoAsignarContenidoASeccion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede asignar contenido a una sección." };
  }

  const parsed = asignarContenidoASeccionSchema.safeParse({
    contentId: formData.get("contentId"),
    seccionId: formData.get("seccionId") ?? "",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { contentId } = parsed.data;
  const seccionId = parsed.data.seccionId === "" ? null : parsed.data.seccionId;

  const contenido = await prisma.contents.findUnique({ where: { id: contentId } });

  if (!contenido) {
    return { success: false, error: "Este contenido no existe." };
  }

  const curso = await prisma.courses.findUnique({ where: { id: contenido.courseId } });

  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "Este curso no te pertenece." };
  }

  if (seccionId) {
    const seccion = await prisma.secciones.findUnique({ where: { id: seccionId } });

    if (!seccion || seccion.courseId !== contenido.courseId) {
      return { success: false, error: "Esta sección no pertenece a este curso." };
    }
  }

  try {
    await prisma.contents.update({ where: { id: contentId }, data: { seccionId } });

    revalidatePath(`/tutor/cursos/${contenido.courseId}`);
    revalidatePath(`/estudiante/cursos/${contenido.courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error asignando contenido a sección:", error);
    return { success: false, error: "No se pudo asignar la sección. Intenta de nuevo." };
  }
}
