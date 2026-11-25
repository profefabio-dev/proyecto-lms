import { describe, it, expect, vi, beforeEach } from "vitest";
import { asignarEstudiantes } from "./assign-students";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn(), findMany: vi.fn() },
    courses: { findUnique: vi.fn() },
    courseUsers: { findMany: vi.fn(), createMany: vi.fn() },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function buildFormData(courseId: string, estudianteIds: string[]) {
  const fd = new FormData();
  fd.append("courseId", courseId);
  estudianteIds.forEach((id) => fd.append("estudianteIds", id));
  return fd;
}

function mockSesionTutor() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
  } as any);
  vi.mocked(prisma.users.findUnique).mockResolvedValue({
    id: "tutor-1",
    rol: "TUTOR",
    // US50: el espacio del tutor es lo que acota qué estudiantes puede
    // inscribir. Sin él, el filtro no encuentra a nadie.
    espacioId: "espacio-1",
  } as any);
}

describe("asignarEstudiantes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesión", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const resultado = await asignarEstudiantes(null, buildFormData("curso-1", ["est-1"]));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el usuario no es tutor", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "ESTUDIANTE" } as any);

    const resultado = await asignarEstudiantes(null, buildFormData("curso-1", ["est-1"]));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si no se selecciona ningún estudiante", async () => {
    mockSesionTutor();

    const resultado = await asignarEstudiantes(null, buildFormData("curso-1", []));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el curso no pertenece al tutor", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "otro-tutor",
    } as any);

    const resultado = await asignarEstudiantes(null, buildFormData("curso-1", ["est-1"]));

    expect(resultado.success).toBe(false);
  });

  it("asigna solo los estudiantes válidos y no inscritos previamente", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.users.findMany).mockResolvedValue([{ id: "est-1" }, { id: "est-2" }] as any);
    vi.mocked(prisma.courseUsers.findMany).mockResolvedValue([{ userId: "est-2" }] as any);
    vi.mocked(prisma.courseUsers.createMany).mockResolvedValue({ count: 1 } as any);

    const resultado = await asignarEstudiantes(
      null,
      buildFormData("curso-1", ["est-1", "est-2"])
    );

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.asignados).toBe(1);
    }
    expect(prisma.courseUsers.createMany).toHaveBeenCalledWith({
      data: [{ courseId: "curso-1", userId: "est-1" }],
    });
  });

  it("propaga el error si la base de datos falla", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.users.findMany).mockResolvedValue([{ id: "est-1" }] as any);
    vi.mocked(prisma.courseUsers.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.courseUsers.createMany).mockRejectedValue(new Error("fallo db"));

    const resultado = await asignarEstudiantes(null, buildFormData("curso-1", ["est-1"]));

    expect(resultado.success).toBe(false);
  });

  // ---- US50: la fuga entre espacios ----
  //
  // Esta es la prueba que importa de esta historia. El selector de la página
  // ya no ofrece estudiantes de otros colegios, pero ocultar una opción no es
  // una restricción: lo que de verdad lo impide es que esta acción no los
  // acepte aunque su id llegue en la petición.

  it("SOLO busca entre los estudiantes del espacio del tutor", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.users.findMany).mockResolvedValue([{ id: "est-1" }] as any);
    vi.mocked(prisma.courseUsers.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.courseUsers.createMany).mockResolvedValue({ count: 1 } as any);

    await asignarEstudiantes(null, buildFormData("curso-1", ["est-1"]));

    const consulta = vi.mocked(prisma.users.findMany).mock.calls[0][0] as any;

    expect(consulta.where.rol).toBe("ESTUDIANTE");
    expect(consulta.where.estado).toBe("ACTIVO");
    // Las dos vías de US50, ninguna de las cuales alcanza a otro espacio.
    expect(consulta.where.OR).toEqual([
      { inscripciones: { some: { course: { tutor: { espacioId: "espacio-1" } } } } },
      { espacioOrigenId: "espacio-1" },
    ]);
  });

  it("RECHAZA el id de un estudiante de otro espacio aunque llegue en la petición", async () => {
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    // La consulta acotada al espacio no lo encuentra: es de otro colegio.
    vi.mocked(prisma.users.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.courseUsers.findMany).mockResolvedValue([] as any);

    const resultado = await asignarEstudiantes(
      null,
      buildFormData("curso-1", ["est-de-otro-colegio"])
    );

    // Lo que importa es que no se escriba nada. La acción responde como
    // cuando se manda un id que no existe —"cero asignados", sin error—, y
    // está bien que sea así: un id que no se puede usar no merece un mensaje
    // distinto según el motivo, porque eso mismo confirmaría al que lo está
    // probando que ese estudiante existe en otro colegio.
    expect(prisma.courseUsers.createMany).not.toHaveBeenCalled();
    expect(resultado.success && resultado.asignados).toBe(0);
  });

  it("acepta a un estudiante recién creado, que todavía no tiene inscripciones", async () => {
    // El caso que rompió el intento del 16/09/2026 y que obligó a revertir.
    mockSesionTutor();
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1",
    } as any);
    vi.mocked(prisma.users.findMany).mockResolvedValue([{ id: "est-nuevo" }] as any);
    vi.mocked(prisma.courseUsers.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.courseUsers.createMany).mockResolvedValue({ count: 1 } as any);

    const resultado = await asignarEstudiantes(null, buildFormData("curso-1", ["est-nuevo"]));

    expect(resultado.success).toBe(true);
    expect(prisma.courseUsers.createMany).toHaveBeenCalled();
  });
});