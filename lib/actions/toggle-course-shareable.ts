"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Rol } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { faltaParaCompartir, mensajeDeRequisitos } from "@/lib/course-shareable";
import { VERSION_LICENCIA } from "@/lib/licencia-compartir";

/**
 * US47 — el Tutor decide si su curso puede ser tomado por otros docentes
 * (23/11/2026).
 *
 * Compartir es decisión de quien crea, no del Super Administrador: cada
 * Tutor manda sobre su trabajo, coherente con el aislamiento por espacios
 * de US24, y nadie queda esperando una aprobación para que lo suyo sirva.
 * Lo que sí se reserva el Super Administrador es el sello de verificado y
 * poder retirar algo del catálogo (US49).
 *
 * Un curso nace con `compartible: false`: nada circula sin que su autor lo
 * diga.
 */
const esquema = z.object({
  courseId: z.string().min(1, "Curso inválido"),
  // US57 (28/11/2026): la casilla de la licencia. Llega solo cuando se
  // **activa** el compartir; dejar de compartir no pide nada.
  aceptaLicencia: z.boolean(),
});

type Resultado = { success: true; compartible: boolean } | { success: false; error: string };

export async function alternarCursoCompartible(
  _prevState: Resultado | null,
  formData: FormData
): Promise<Resultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Debes iniciar sesión para realizar esta acción." };
  }

  const usuarioActual = await prisma.users.findUnique({ where: { authId: user.id } });

  if (!usuarioActual || usuarioActual.rol !== Rol.TUTOR) {
    return { success: false, error: "Solo un tutor puede compartir un curso." };
  }

  const parsed = esquema.safeParse({
    courseId: formData.get("courseId"),
    aceptaLicencia: formData.get("aceptaLicencia") === "si",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const curso = await prisma.courses.findUnique({
    where: { id: parsed.data.courseId },
    include: {
      _count: {
        select: {
          contenidos: { where: { visible: true } },
          actividades: { where: { visible: true } },
          quizzes: { where: { visible: true } },
        },
      },
    },
  });

  // Mismo chequeo de propiedad que el resto de acciones sobre un curso: el
  // dueño y nadie más.
  if (!curso || curso.tutorId !== usuarioActual.id) {
    return { success: false, error: "No encontramos ese curso entre los tuyos." };
  }

  // US49: el piso de calidad. Se comprueba solo al compartir — dejar de
  // compartir siempre se puede, y un curso que ya circulaba no se queda
  // atrapado si el tutor le oculta una lección después.
  if (!curso.compartible) {
    const falta = faltaParaCompartir({
      descripcion: curso.descripcion,
      imagen: curso.imagen,
      leccionesVisibles: curso._count.contenidos,
      actividadesVisibles: curso._count.actividades,
      evaluacionesVisibles: curso._count.quizzes,
    });

    if (falta.length > 0) {
      return { success: false, error: mensajeDeRequisitos(falta) };
    }
  }

  // US57: sin la casilla no se comparte. La comprobación va en el servidor
  // y no solo en el formulario, por la razón de siempre: un botón
  // deshabilitado no impide reenviar la petición, y acá lo que está en
  // juego es el permiso del autor sobre su propio trabajo.
  if (!curso.compartible && !parsed.data.aceptaLicencia) {
    return {
      success: false,
      error: "Para compartir el curso tienes que aceptar los términos.",
    };
  }

  try {
    const actualizado = await prisma.courses.update({
      where: { id: curso.id },
      data: {
        compartible: !curso.compartible,
        // Se guarda **qué** versión aceptó y cuándo, no un simple "sí".
        // Al dejar de compartir no se borra: es el registro de que ese día
        // aceptó, y sirve igual para las copias que ya se hicieron.
        ...(curso.compartible
          ? {}
          : { licenciaVersion: VERSION_LICENCIA, licenciaAceptadaEn: new Date() }),
      },
    });

    revalidatePath(`/tutor/cursos/${curso.id}`);
    revalidatePath("/tutor/cursos");
    // El catálogo y la ficha de este curso, donde acaba de aparecer o
    // desaparecer.
    revalidatePath("/tutor/catalogo");
    revalidatePath(`/tutor/catalogo/${curso.id}`);

    return { success: true, compartible: actualizado.compartible };
  } catch (error) {
    console.error("Error al cambiar si el curso es compartible:", error);
    return { success: false, error: "No se pudo guardar el cambio. Intenta de nuevo." };
  }
}
