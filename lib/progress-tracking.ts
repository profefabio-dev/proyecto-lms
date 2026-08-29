import { prisma } from "@/lib/prisma";

/**
 * US19: registra que un Estudiante vio uno o más contenidos.
 *
 * A diferencia del resto de mutaciones del proyecto (Server Actions
 * disparadas por un formulario), esto se marca automáticamente cuando el
 * Estudiante abre la página de detalle de un curso — el criterio de
 * aceptación pide marcar el avance sin una acción manual adicional, así
 * que esta es una función simple llamada directamente desde el Server
 * Component de esa página (`app/estudiante/cursos/[courseId]/page.tsx`),
 * no una Server Action con su propio formulario.
 *
 * `skipDuplicates` hace que sea seguro llamarla en cada carga de la
 * página sin duplicar registros ni fallar por la restricción única
 * (`@@unique([contentId, userId])` en `ContentViews`), y conserva la
 * fecha de la primera vez que se vio cada contenido.
 */
export async function registrarContenidosVistos(
  userId: string,
  contentIds: string[]
): Promise<void> {
  if (contentIds.length === 0) {
    return;
  }

  await prisma.contentViews.createMany({
    data: contentIds.map((contentId) => ({ contentId, userId })),
    skipDuplicates: true,
  });
}
