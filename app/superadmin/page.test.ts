import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    espacios: {
      findMany: vi.fn(),
    },
    courses: {
      count: vi.fn(),
    },
  },
}));

// La página renderiza <CreateEspacioForm> (US25) y <ToggleEspacioStatusForm>
// (US28), que importan Server Actions que a su vez llegan a
// createSyncedUser/setSyncedUserActiveState y, en cadena, al cliente admin
// de Supabase. Se mockean para que esta siga siendo una prueba unitaria de
// la página.
vi.mock("@/lib/supabase/sync-user", () => ({
  createSyncedUser: vi.fn(),
  setSyncedUserActiveState: vi.fn(),
}));

import SuperAdminPage from "./page";
import { redirect } from "next/navigation";
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

describe("SuperAdminPage (US25/US27)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.courses.count as any).mockResolvedValue(0);
    (prisma.users.count as any).mockResolvedValue(0);
  });

  it("redirige a /login si no hay sesion activa", async () => {
    mockSesion(null);

    await expect(SuperAdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.espacios.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si el usuario autenticado no es Super Administrador", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });

    await expect(SuperAdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(prisma.espacios.findMany).not.toHaveBeenCalled();
  });

  it("redirige a /login si el authId no tiene registro en Users", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue(null);

    await expect(SuperAdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("consulta el listado de espacios con sus Administradores/Tutores incluidos", async () => {
    mockSesion("auth-3");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "SUPERADMIN" });
    (prisma.espacios.findMany as any).mockResolvedValue([]);

    await SuperAdminPage();

    expect(prisma.espacios.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: { usuarios: { orderBy: { createdAt: "asc" } } },
    });
  });

  it("calcula Administrador principal, tutores, estudiantes y cursos por espacio (US27)", async () => {
    mockSesion("auth-3");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "SUPERADMIN" });
    (prisma.espacios.findMany as any).mockResolvedValue([
      {
        id: "espacio-1",
        nombre: "Espacio de prueba",
        estado: "ACTIVO",
        usuarios: [
          { id: "t1", rol: "TUTOR", nombre: "Tina", apellido: "Tutora" },
          { id: "a1", rol: "ADMINISTRADOR", nombre: "Ana", apellido: "Admin" },
        ],
      },
    ]);
    (prisma.courses.count as any).mockResolvedValue(3);
    (prisma.users.count as any).mockResolvedValue(7);

    await SuperAdminPage();

    // El Administrador "principal" es el primero por antigüedad en el
    // arreglo `usuarios` (ya viene ordenado asc por createdAt desde la
    // consulta), no necesariamente el primero de la lista sin ordenar.
    expect(prisma.courses.count).toHaveBeenCalledWith({
      where: { tutor: { espacioId: "espacio-1" } },
    });
    expect(prisma.users.count).toHaveBeenCalledWith({
      where: {
        rol: "ESTUDIANTE",
        inscripciones: { some: { course: { tutor: { espacioId: "espacio-1" } } } },
      },
    });
  });
});
