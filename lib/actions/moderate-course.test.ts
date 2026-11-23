/**
 * US49 — las dos acciones del Super Administrador sobre cursos ajenos
 * (24/11/2026).
 *
 * Son la única excepción a la regla de que solo el dueño toca su curso, así
 * que lo que más importa fijar aquí es que **nadie más puede usarlas**: ni
 * un Tutor, ni un Administrador de espacio, ni alguien sin sesión.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    courses: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { alternarCursoVerificado, retirarCursoDelCatalogo } from "./moderate-course";
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

function formData(courseId = "curso-1") {
  const fd = new FormData();
  fd.set("courseId", courseId);
  return fd;
}

describe("alternarCursoVerificado (US49)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "sa-1", rol: "SUPERADMIN" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      verificado: false,
      compartible: true,
    });
  });

  it("rechaza si no hay sesión", async () => {
    mockSesion(null);

    const r = await alternarCursoVerificado(null, formData());

    expect(r).toEqual({ success: false, error: "No tienes permiso para esta acción." });
    expect(prisma.courses.update).not.toHaveBeenCalled();
  });

  it("RECHAZA a un Tutor: verificar no es cosa suya", async () => {
    (prisma.users.findUnique as any).mockResolvedValue({ id: "t-1", rol: "TUTOR" });

    const r = await alternarCursoVerificado(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.courses.update).not.toHaveBeenCalled();
  });

  it("RECHAZA a un Administrador de espacio", async () => {
    (prisma.users.findUnique as any).mockResolvedValue({ id: "a-1", rol: "ADMINISTRADOR" });

    const r = await alternarCursoVerificado(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.courses.update).not.toHaveBeenCalled();
  });

  it("no verifica un curso que su autor no ha compartido", async () => {
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      verificado: false,
      compartible: false,
    });

    const r = await alternarCursoVerificado(null, formData());

    expect(r).toEqual({
      success: false,
      error: "Solo se puede verificar un curso que su autor haya compartido.",
    });
  });

  it("pone el sello", async () => {
    (prisma.courses.update as any).mockResolvedValue({ verificado: true });

    const r = await alternarCursoVerificado(null, formData());

    expect(r.success).toBe(true);
    expect(prisma.courses.update).toHaveBeenCalledWith({
      where: { id: "curso-1" },
      data: { verificado: true },
    });
  });

  it("lo quita si ya lo tenía, aunque el curso ya no esté compartido", async () => {
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      verificado: true,
      compartible: false,
    });
    (prisma.courses.update as any).mockResolvedValue({ verificado: false });

    const r = await alternarCursoVerificado(null, formData());

    expect(r.success).toBe(true);
    expect(prisma.courses.update).toHaveBeenCalledWith({
      where: { id: "curso-1" },
      data: { verificado: false },
    });
  });
});

describe("retirarCursoDelCatalogo (US49)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "sa-1", rol: "SUPERADMIN" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      titulo: "Curso de otro",
      compartible: true,
    });
  });

  it("RECHAZA a un Tutor", async () => {
    (prisma.users.findUnique as any).mockResolvedValue({ id: "t-1", rol: "TUTOR" });

    const r = await retirarCursoDelCatalogo(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.courses.update).not.toHaveBeenCalled();
  });

  it("retira el curso y le quita el sello en la misma operación", async () => {
    // Lo retirado no puede seguir llevando el respaldo de la plataforma.
    (prisma.courses.update as any).mockResolvedValue({});

    const r = await retirarCursoDelCatalogo(null, formData());

    expect(r.success).toBe(true);
    expect(prisma.courses.update).toHaveBeenCalledWith({
      where: { id: "curso-1" },
      data: { compartible: false, verificado: false },
    });
  });

  it("NO borra el curso ni toca a sus estudiantes", async () => {
    (prisma.courses.update as any).mockResolvedValue({});

    const r = await retirarCursoDelCatalogo(null, formData());

    // Solo se escriben esas dos banderas: nada de delete, nada de
    // inscripciones, nada de contenido.
    const datos = (prisma.courses.update as any).mock.calls[0][0].data;
    expect(Object.keys(datos).sort()).toEqual(["compartible", "verificado"]);
    expect(r.success && r.mensaje).toContain("conserva el curso");
  });

  it("avisa si el curso ya no estaba en el catálogo", async () => {
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      titulo: "Curso",
      compartible: false,
    });

    const r = await retirarCursoDelCatalogo(null, formData());

    expect(r).toEqual({ success: false, error: "Ese curso ya no está en el catálogo." });
  });
});
