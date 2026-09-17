import { describe, it, expect, vi, beforeEach } from "vitest";
import { previsualizarCargaEstudiantes, confirmarCargaEstudiantes } from "./bulk-import-students";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSyncedUser } from "@/lib/supabase/sync-user";
import { parsearArchivoEstudiantes } from "@/lib/parse-student-file";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    courses: { findUnique: vi.fn() },
    courseUsers: { createMany: vi.fn() },
  },
}));
vi.mock("@/lib/supabase/sync-user");
vi.mock("@/lib/parse-student-file", async () => {
  const actual = await vi.importActual<typeof import("@/lib/parse-student-file")>(
    "@/lib/parse-student-file"
  );
  return { ...actual, parsearArchivoEstudiantes: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function mockSesion(rol: string | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: rol ? { id: "auth-1" } : null } }) },
  } as any);
  if (rol) {
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "user-1", rol } as any);
  }
}

function buildFormData(data: Record<string, string>) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

describe("previsualizarCargaEstudiantes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesión", async () => {
    mockSesion(null);
    const fd = buildFormData({});
    const resultado = await previsualizarCargaEstudiantes(null, fd);
    expect(resultado.success).toBe(false);
  });

  it("rechaza si el usuario no es tutor ni administrador", async () => {
    mockSesion("ESTUDIANTE");
    const fd = buildFormData({});
    const resultado = await previsualizarCargaEstudiantes(null, fd);
    expect(resultado.success).toBe(false);
  });

  it("rechaza si no se sube ningún archivo", async () => {
    mockSesion("TUTOR");
    const fd = buildFormData({});
    const resultado = await previsualizarCargaEstudiantes(null, fd);
    expect(resultado.success).toBe(false);
  });

  it("rechaza una extensión no reconocida", async () => {
    mockSesion("TUTOR");
    const fd = new FormData();
    fd.append("archivo", new File(["contenido"], "listado.docx"));
    const resultado = await previsualizarCargaEstudiantes(null, fd);
    expect(resultado.success).toBe(false);
  });

  it("rechaza si el parseo no encuentra ningún estudiante", async () => {
    mockSesion("TUTOR");
    vi.mocked(parsearArchivoEstudiantes).mockResolvedValue({
      grupos: [],
      advertencias: ["no se reconoció nada"],
    });
    const fd = new FormData();
    fd.append("archivo", new File(["contenido"], "listado.xlsx"));
    const resultado = await previsualizarCargaEstudiantes(null, fd);
    expect(resultado.success).toBe(false);
  });

  it("devuelve los grupos detectados cuando el parseo tiene éxito", async () => {
    mockSesion("ADMINISTRADOR");
    vi.mocked(parsearArchivoEstudiantes).mockResolvedValue({
      grupos: [{ nombre: "6A", estudiantes: [{ nombre: "Carlos", apellido: "Gaviria" }] }],
      advertencias: [],
    });
    const fd = new FormData();
    fd.append("archivo", new File(["contenido"], "listado.xlsx"));
    const resultado = await previsualizarCargaEstudiantes(null, fd);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.grupos).toHaveLength(1);
    }
  });
});

describe("confirmarCargaEstudiantes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.users.findMany).mockResolvedValue([]);
    vi.mocked(prisma.users.findFirst).mockResolvedValue(null);
  });

  it("rechaza si no hay sesión", async () => {
    mockSesion(null);
    const resultado = await confirmarCargaEstudiantes(
      null,
      buildFormData({ estudiantes: "[]" })
    );
    expect(resultado.success).toBe(false);
  });

  it("rechaza si la lista de estudiantes llega vacía", async () => {
    mockSesion("TUTOR");
    const resultado = await confirmarCargaEstudiantes(
      null,
      buildFormData({ estudiantes: "[]" })
    );
    expect(resultado.success).toBe(false);
  });

  it("rechaza JSON corrupto en el campo estudiantes", async () => {
    mockSesion("TUTOR");
    const resultado = await confirmarCargaEstudiantes(
      null,
      buildFormData({ estudiantes: "{no es json" })
    );
    expect(resultado.success).toBe(false);
  });

  it("rechaza un curso que no pertenece al tutor", async () => {
    mockSesion("TUTOR");
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({ id: "c1", tutorId: "otro" } as any);
    const resultado = await confirmarCargaEstudiantes(
      null,
      buildFormData({
        estudiantes: JSON.stringify([{ nombre: "Carlos", apellido: "Gaviria" }]),
        courseId: "c1",
      })
    );
    expect(resultado.success).toBe(false);
  });

  it("crea los estudiantes nuevos y omite los que ya existen", async () => {
    mockSesion("TUTOR");
    vi.mocked(prisma.users.findFirst)
      .mockResolvedValueOnce(null) // Carlos no existe
      .mockResolvedValueOnce({ id: "ya-existe" } as any); // Ana ya existe
    vi.mocked(createSyncedUser).mockResolvedValue({ id: "nuevo-1" } as any);

    const resultado = await confirmarCargaEstudiantes(
      null,
      buildFormData({
        estudiantes: JSON.stringify([
          { nombre: "Carlos", apellido: "Gaviria" },
          { nombre: "Ana", apellido: "Torres" },
        ]),
      })
    );

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.creados).toHaveLength(1);
      expect(resultado.creados[0].nombre).toBe("Carlos");
      expect(resultado.omitidos).toHaveLength(1);
      expect(resultado.omitidos[0].nombre).toBe("Ana");
    }
  });

  it("omite una fila sin abortar el resto si createSyncedUser falla", async () => {
    mockSesion("ADMINISTRADOR");
    vi.mocked(createSyncedUser)
      .mockRejectedValueOnce(new Error("fallo de Auth"))
      .mockResolvedValueOnce({ id: "nuevo-2" } as any);

    const resultado = await confirmarCargaEstudiantes(
      null,
      buildFormData({
        estudiantes: JSON.stringify([
          { nombre: "Carlos", apellido: "Gaviria" },
          { nombre: "Ana", apellido: "Torres" },
        ]),
      })
    );

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.creados).toHaveLength(1);
      expect(resultado.omitidos).toHaveLength(1);
      expect(resultado.omitidos[0].motivo).toContain("sincronización con Auth");
    }
  });

  it("inscribe a los estudiantes creados cuando un tutor selecciona un curso propio", async () => {
    mockSesion("TUTOR");
    vi.mocked(prisma.courses.findUnique).mockResolvedValue({ id: "c1", tutorId: "user-1" } as any);
    vi.mocked(createSyncedUser).mockResolvedValue({ id: "nuevo-1" } as any);

    const resultado = await confirmarCargaEstudiantes(
      null,
      buildFormData({
        estudiantes: JSON.stringify([{ nombre: "Carlos", apellido: "Gaviria" }]),
        courseId: "c1",
      })
    );

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.inscritos).toBe(1);
    }
    expect(prisma.courseUsers.createMany).toHaveBeenCalledWith({
      data: [{ courseId: "c1", userId: "nuevo-1" }],
    });
  });

  it("no inscribe cuando lo sube un administrador, aunque mande un courseId", async () => {
    mockSesion("ADMINISTRADOR");
    vi.mocked(createSyncedUser).mockResolvedValue({ id: "nuevo-1" } as any);

    const resultado = await confirmarCargaEstudiantes(
      null,
      buildFormData({
        estudiantes: JSON.stringify([{ nombre: "Carlos", apellido: "Gaviria" }]),
        courseId: "c1",
      })
    );

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.inscritos).toBe(0);
    }
    expect(prisma.courseUsers.createMany).not.toHaveBeenCalled();
  });
});
