import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findUnique: vi.fn() },
    reportesCurso: { create: vi.fn() },
  },
}));

import { reportarCurso } from "./report-course";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function mockSesion(authUserId: string | null) {
  (createClient as any).mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: authUserId ? { id: authUserId } : null } }),
    },
  });
}

function crearFormData(courseId = "curso-1", motivo = "Contenido inapropiado", detalles = "Tiene lenguaje ofensivo") {
  const fd = new FormData();
  fd.set("courseId", courseId);
  fd.set("motivo", motivo);
  if (detalles) fd.set("detalles", detalles);
  return fd;
}

describe("reportarCurso (US49)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("auth-tutor");
    (prisma.users.findUnique as any).mockResolvedValue({
      id: "tutor-1",
      rol: "TUTOR",
    });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-ajeno",
      compartible: true,
    });
    (prisma.reportesCurso.create as any).mockResolvedValue({
      id: "reporte-1",
    });
  });

  it("rechaza si no hay sesión activa", async () => {
    mockSesion(null);

    const res = await reportarCurso(null, crearFormData());

    expect(res.success).toBe(false);
    expect(res).toEqual({ success: false, error: "Debes iniciar sesión para reportar un curso." });
    expect(prisma.reportesCurso.create).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario no tiene rol TUTOR (ej. ESTUDIANTE)", async () => {
    (prisma.users.findUnique as any).mockResolvedValue({
      id: "estudiante-1",
      rol: "ESTUDIANTE",
    });

    const res = await reportarCurso(null, crearFormData());

    expect(res.success).toBe(false);
    expect(res).toEqual({ success: false, error: "Solo los tutores pueden reportar cursos del catálogo." });
    expect(prisma.reportesCurso.create).not.toHaveBeenCalled();
  });

  it("rechaza si faltan campos obligatorios o el motivo es muy corto", async () => {
    const fd = new FormData();
    fd.set("courseId", "curso-1");
    fd.set("motivo", "no");

    const res = await reportarCurso(null, fd);

    expect(res.success).toBe(false);
    expect(prisma.reportesCurso.create).not.toHaveBeenCalled();
  });

  it("rechaza si el curso no existe o no es compartible", async () => {
    (prisma.courses.findUnique as any).mockResolvedValue(null);

    const res = await reportarCurso(null, crearFormData());

    expect(res.success).toBe(false);
    expect(res).toEqual({ success: false, error: "El curso no existe o no está en el catálogo compartido." });
    expect(prisma.reportesCurso.create).not.toHaveBeenCalled();
  });

  it("rechaza si el tutor intenta reportar su propio curso", async () => {
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      tutorId: "tutor-1", // mismo id que el usuario autenticado
      compartible: true,
    });

    const res = await reportarCurso(null, crearFormData());

    expect(res.success).toBe(false);
    expect(res).toEqual({ success: false, error: "No puedes reportar tu propio curso." });
    expect(prisma.reportesCurso.create).not.toHaveBeenCalled();
  });

  it("guarda el reporte correctamente si todo es válido", async () => {
    const res = await reportarCurso(null, crearFormData("curso-1", "Contenido inapropiado", "Detalles del problema"));

    expect(res.success).toBe(true);
    expect(prisma.reportesCurso.create).toHaveBeenCalledWith({
      data: {
        courseId: "curso-1",
        tutorId: "tutor-1",
        motivo: "Contenido inapropiado",
        detalles: "Detalles del problema",
      },
    });
  });
});
