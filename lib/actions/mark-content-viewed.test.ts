import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
    },
    contents: {
      findUnique: vi.fn(),
    },
    courseUsers: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/progress-tracking", () => ({
  registrarContenidosVistos: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { marcarContenidoVisto } from "./mark-content-viewed";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { registrarContenidosVistos } from "@/lib/progress-tracking";

function buildFormData(data: Record<string, string>) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.set(k, v));
  return fd;
}

function mockSesion(authUserId: string | null) {
  (createClient as any).mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: authUserId ? { id: authUserId } : null } }),
    },
  });
}

describe("marcarContenidoVisto (US19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesion activa", async () => {
    mockSesion(null);

    const resultado = await marcarContenidoVisto(buildFormData({ contentId: "c1" }));

    expect(resultado.success).toBe(false);
    expect(registrarContenidosVistos).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario autenticado no es Estudiante", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "u1", rol: "TUTOR" });

    const resultado = await marcarContenidoVisto(buildFormData({ contentId: "c1" }));

    expect(resultado.success).toBe(false);
    expect(registrarContenidosVistos).not.toHaveBeenCalled();
  });

  it("rechaza si falta el contentId", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });

    const resultado = await marcarContenidoVisto(buildFormData({}));

    expect(resultado.success).toBe(false);
    expect(registrarContenidosVistos).not.toHaveBeenCalled();
  });

  it("rechaza si el contenido no existe", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.contents.findUnique as any).mockResolvedValue(null);

    const resultado = await marcarContenidoVisto(buildFormData({ contentId: "no-existe" }));

    expect(resultado.success).toBe(false);
    expect(registrarContenidosVistos).not.toHaveBeenCalled();
  });

  it("rechaza si el contenido esta oculto", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.contents.findUnique as any).mockResolvedValue({
      id: "c1",
      courseId: "curso-1",
      visible: false,
    });

    const resultado = await marcarContenidoVisto(buildFormData({ contentId: "c1" }));

    expect(resultado.success).toBe(false);
    expect(registrarContenidosVistos).not.toHaveBeenCalled();
  });

  it("rechaza si el estudiante no esta inscrito en el curso del contenido", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.contents.findUnique as any).mockResolvedValue({
      id: "c1",
      courseId: "curso-1",
      visible: true,
    });
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);

    const resultado = await marcarContenidoVisto(buildFormData({ contentId: "c1" }));

    expect(resultado.success).toBe(false);
    expect(registrarContenidosVistos).not.toHaveBeenCalled();
  });

  it("marca el contenido como visto cuando todo es valido", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.contents.findUnique as any).mockResolvedValue({
      id: "c1",
      courseId: "curso-1",
      visible: true,
    });
    (prisma.courseUsers.findFirst as any).mockResolvedValue({ id: "insc-1" });
    (registrarContenidosVistos as any).mockResolvedValue(undefined);

    const resultado = await marcarContenidoVisto(buildFormData({ contentId: "c1" }));

    expect(resultado.success).toBe(true);
    expect(registrarContenidosVistos).toHaveBeenCalledWith("est-1", ["c1"]);
  });
});
