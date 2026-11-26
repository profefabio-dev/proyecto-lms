/**
 * US51 — inscribirse a un curso con su código de clase (26/11/2026).
 *
 * La acción se construyó el 25/11 **sin ninguna prueba** (las seis de
 * `lib/course-code.test.ts` cubren el formateo del código, no la
 * inscripción). Estas cubren las guardas que ya tenía y, sobre todo, las
 * tres que se agregaron al endurecerla: código completo, coincidencia
 * única y filtro en la base de datos en vez de en memoria.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn(), update: vi.fn() },
    courses: { findMany: vi.fn() },
    courseUsers: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

import { unirseACursoConCodigo } from "./join-course-by-code";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// El id del curso de prueba: su código es "a1b2c3d4" -> "A1B2-C3D4".
const CURSO_ID = "a1b2c3d4-1111-2222-3333-444455556666";

function mockSesion(
  usuario: { rol: string; estado?: string; espacioOrigenId?: string | null } | null
) {
  (createClient as any).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: usuario ? { id: "auth-1" } : null } }),
    },
  });
  if (usuario) {
    (prisma.users.findUnique as any).mockResolvedValue({
      id: "est-1",
      rol: usuario.rol,
      estado: usuario.estado ?? "ACTIVO",
      // `??` no sirve acá: un `null` explícito es justo el caso que se
      // quiere probar (una cuenta sin espacio de origen).
      espacioOrigenId:
        "espacioOrigenId" in usuario ? usuario.espacioOrigenId : "espacio-1",
    });
  }
}

function formData(codigo: string) {
  const fd = new FormData();
  fd.set("codigo", codigo);
  return fd;
}

function curso(id = CURSO_ID, espacioId: string | null = "espacio-1") {
  return { id, titulo: "Robótica educativa", tutor: { espacioId } };
}

describe("unirseACursoConCodigo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion({ rol: "ESTUDIANTE" });
    (prisma.courses.findMany as any).mockResolvedValue([curso()]);
    (prisma.courseUsers.findUnique as any).mockResolvedValue(null);
    (prisma.courseUsers.create as any).mockResolvedValue({ id: "ins-1" });
  });

  it("rechaza si no hay sesión", async () => {
    mockSesion(null);

    const r = await unirseACursoConCodigo(null, formData("A1B2-C3D4"));

    expect(r.success).toBe(false);
    expect(prisma.courseUsers.create).not.toHaveBeenCalled();
  });

  it("rechaza a quien no es Estudiante", async () => {
    mockSesion({ rol: "TUTOR" });

    const r = await unirseACursoConCodigo(null, formData("A1B2-C3D4"));

    expect(r.success).toBe(false);
    expect(prisma.courseUsers.create).not.toHaveBeenCalled();
  });

  it("rechaza una cuenta desactivada", async () => {
    mockSesion({ rol: "ESTUDIANTE", estado: "INACTIVO" });

    const r = await unirseACursoConCodigo(null, formData("A1B2-C3D4"));

    expect(r.success).toBe(false);
    expect(prisma.courseUsers.create).not.toHaveBeenCalled();
  });

  // Las tres del endurecimiento del 26/11/2026.

  it("RECHAZA un código incompleto y no consulta la base de datos", async () => {
    // Antes bastaban cuatro caracteres: 65 536 combinaciones.
    const r = await unirseACursoConCodigo(null, formData("A1B2"));

    expect(r.success).toBe(false);
    expect(prisma.courses.findMany).not.toHaveBeenCalled();
  });

  it("rechaza un código más largo que el real", async () => {
    const r = await unirseACursoConCodigo(null, formData("A1B2-C3D45"));

    expect(r.success).toBe(false);
    expect(prisma.courses.findMany).not.toHaveBeenCalled();
  });

  it("rechaza un código vacío", async () => {
    const r = await unirseACursoConCodigo(null, formData("   "));

    expect(r.success).toBe(false);
    expect(prisma.courses.findMany).not.toHaveBeenCalled();
  });

  it("filtra en la base de datos por el comienzo del id, no en memoria", async () => {
    await unirseACursoConCodigo(null, formData("A1B2-C3D4"));

    const where = (prisma.courses.findMany as any).mock.calls[0][0].where;
    expect(where.estado).toBe("PUBLICADO");
    expect(where.id).toEqual({ startsWith: "a1b2c3d4", mode: "insensitive" });
  });

  it("RECHAZA el código si coincidiera con más de un curso, en vez de elegir uno", async () => {
    (prisma.courses.findMany as any).mockResolvedValue([
      curso(),
      curso("a1b2c3d4-9999-8888-7777-666655554444"),
    ]);

    const r = await unirseACursoConCodigo(null, formData("A1B2-C3D4"));

    expect(r.success).toBe(false);
    expect(prisma.courseUsers.create).not.toHaveBeenCalled();
  });

  it("descarta un curso que la base de datos trajo pero cuyo código no es exacto", async () => {
    // La consulta es `insensitive` y por prefijo: la igualdad exacta se
    // confirma en el código.
    (prisma.courses.findMany as any).mockResolvedValue([
      curso("a1b2c3d5-1111-2222-3333-444455556666"),
    ]);

    const r = await unirseACursoConCodigo(null, formData("A1B2-C3D4"));

    expect(r.success).toBe(false);
    expect(prisma.courseUsers.create).not.toHaveBeenCalled();
  });

  // El camino feliz y sus variantes.

  it("inscribe al estudiante con el código completo, escrito sin guion", async () => {
    const r = await unirseACursoConCodigo(null, formData("a1b2c3d4"));

    expect(r.success).toBe(true);
    expect(prisma.courseUsers.create).toHaveBeenCalledWith({
      data: { courseId: CURSO_ID, userId: "est-1" },
    });
  });

  it("no duplica la inscripción si ya estaba inscrito", async () => {
    (prisma.courseUsers.findUnique as any).mockResolvedValue({ id: "ins-vieja" });

    const r = await unirseACursoConCodigo(null, formData("A1B2-C3D4"));

    expect(r.success && r.yaInscrito).toBe(true);
    expect(prisma.courseUsers.create).not.toHaveBeenCalled();
  });

  it("no encuentra un curso que no esté publicado", async () => {
    // La consulta ya filtra por PUBLICADO, así que un curso en borrador
    // simplemente no vuelve.
    (prisma.courses.findMany as any).mockResolvedValue([]);

    const r = await unirseACursoConCodigo(null, formData("A1B2-C3D4"));

    expect(r.success).toBe(false);
    expect(prisma.courseUsers.create).not.toHaveBeenCalled();
  });

  it("guarda el espacio de origen solo si la cuenta no lo tenía (US50)", async () => {
    mockSesion({ rol: "ESTUDIANTE", espacioOrigenId: null });

    await unirseACursoConCodigo(null, formData("A1B2-C3D4"));

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: "est-1" },
      data: { espacioOrigenId: "espacio-1" },
    });
  });

  it("NO reasigna el espacio de origen de quien ya lo tenía", async () => {
    mockSesion({ rol: "ESTUDIANTE", espacioOrigenId: "espacio-de-su-colegio" });
    (prisma.courses.findMany as any).mockResolvedValue([curso(CURSO_ID, "espacio-de-otro")]);

    await unirseACursoConCodigo(null, formData("A1B2-C3D4"));

    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it("informa el error y lo registra si falla la inscripción", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    (prisma.courseUsers.create as any).mockRejectedValue(new Error("se cayó la base"));

    const r = await unirseACursoConCodigo(null, formData("A1B2-C3D4"));

    expect(r.success).toBe(false);
    expect(consola).toHaveBeenCalled();
    consola.mockRestore();
  });
});
