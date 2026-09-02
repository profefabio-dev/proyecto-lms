import { describe, it, expect, vi, beforeEach } from "vitest";

// Mockeamos el cliente admin de Supabase: en la prueba nunca llamamos
// a la API real, solo simulamos sus respuestas.
vi.mock("./admin", () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn(),
        updateUserById: vi.fn(),
      },
    },
  },
}));

// Lo mismo con Prisma: no tocamos la base de datos real en una prueba unitaria.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {
  createSyncedUser,
  updateSyncedUserEmail,
  setSyncedUserActiveState,
  resetSyncedUserPassword,
} from "./sync-user";
import { supabaseAdmin } from "./admin";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";

describe("createSyncedUser (US21)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea el usuario en Auth y en la base de datos, vinculados por authId", async () => {
    (supabaseAdmin.auth.admin.createUser as any).mockResolvedValue({
      data: { user: { id: "auth-id-123" } },
      error: null,
    });

    (prisma.users.create as any).mockResolvedValue({
      id: "db-id-456",
      authId: "auth-id-123",
      email: "test@example.com",
      nombre: "Test",
      apellido: "User",
      rol: Rol.TUTOR,
      estado: "ACTIVO",
    });

    const resultado = await createSyncedUser({
      email: "test@example.com",
      password: "clave-segura",
      nombre: "Test",
      apellido: "User",
      rol: Rol.TUTOR,
    });

    expect(resultado.authId).toBe("auth-id-123");
    expect(prisma.users.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ authId: "auth-id-123" }),
    });
  });

  it("pasa espacioId a Prisma cuando se recibe (épica Multi-docente, US24)", async () => {
    (supabaseAdmin.auth.admin.createUser as any).mockResolvedValue({
      data: { user: { id: "auth-id-123" } },
      error: null,
    });
    (prisma.users.create as any).mockResolvedValue({ id: "db-id-456" });

    await createSyncedUser({
      email: "tutor@example.com",
      password: "clave-segura",
      nombre: "Test",
      apellido: "User",
      rol: Rol.TUTOR,
      espacioId: "espacio-1",
    });

    expect(prisma.users.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ espacioId: "espacio-1" }),
    });
  });

  it("deja espacioId sin definir cuando no se recibe (SUPERADMIN/ESTUDIANTE)", async () => {
    (supabaseAdmin.auth.admin.createUser as any).mockResolvedValue({
      data: { user: { id: "auth-id-999" } },
      error: null,
    });
    (prisma.users.create as any).mockResolvedValue({ id: "db-id-999" });

    await createSyncedUser({
      email: "estudiante@example.com",
      password: "clave-segura",
      nombre: "Test",
      apellido: "User",
      rol: Rol.ESTUDIANTE,
    });

    expect(prisma.users.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ espacioId: undefined }),
    });
  });

  it("lanza un error y no llama a Prisma si falla la creación en Supabase Auth", async () => {
    (supabaseAdmin.auth.admin.createUser as any).mockResolvedValue({
      data: { user: null },
      error: { message: "Email ya registrado" },
    });

    await expect(
      createSyncedUser({
        email: "duplicado@example.com",
        password: "clave-segura",
        nombre: "Test",
        apellido: "User",
        rol: Rol.ESTUDIANTE,
      })
    ).rejects.toThrow(/No se pudo crear el usuario en Supabase Auth/);

    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it("revierte (borra) el usuario de Auth si falla el guardado en la base de datos", async () => {
    (supabaseAdmin.auth.admin.createUser as any).mockResolvedValue({
      data: { user: { id: "auth-id-789" } },
      error: null,
    });

    (prisma.users.create as any).mockRejectedValue(
      new Error("Email duplicado en la base de datos")
    );

    await expect(
      createSyncedUser({
        email: "test2@example.com",
        password: "clave-segura",
        nombre: "Test",
        apellido: "User",
        rol: Rol.ESTUDIANTE,
      })
    ).rejects.toThrow(/se revirtió el alta en Auth/);

    expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(
      "auth-id-789"
    );
  });
});

describe("updateSyncedUserEmail (US22)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no llama a Auth ni a Prisma si el email nuevo es igual al actual", async () => {
    await updateSyncedUserEmail({
      usuarioId: "db-1",
      authId: "auth-1",
      emailActual: "igual@example.com",
      nuevoEmail: "igual@example.com",
    });

    expect(supabaseAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it("lanza un error si el usuario no tiene authId vinculado", async () => {
    await expect(
      updateSyncedUserEmail({
        usuarioId: "db-1",
        authId: null,
        emailActual: "viejo@example.com",
        nuevoEmail: "nuevo@example.com",
      })
    ).rejects.toThrow(/no tiene una cuenta de Supabase Auth vinculada/);

    expect(supabaseAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it("actualiza Auth y luego Users cuando todo sale bien", async () => {
    (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({ error: null });
    (prisma.users.update as any).mockResolvedValue({ id: "db-1", email: "nuevo@example.com" });

    await updateSyncedUserEmail({
      usuarioId: "db-1",
      authId: "auth-1",
      emailActual: "viejo@example.com",
      nuevoEmail: "nuevo@example.com",
    });

    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith("auth-1", {
      email: "nuevo@example.com",
    });
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: "db-1" },
      data: { email: "nuevo@example.com" },
    });
  });

  it("lanza un error y no toca Prisma si falla la actualizacion en Auth", async () => {
    (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({
      error: { message: "Email ya en uso" },
    });

    await expect(
      updateSyncedUserEmail({
        usuarioId: "db-1",
        authId: "auth-1",
        emailActual: "viejo@example.com",
        nuevoEmail: "nuevo@example.com",
      })
    ).rejects.toThrow(/No se pudo actualizar el email en Supabase Auth/);

    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it("revierte el email en Auth si falla el guardado en Users", async () => {
    (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({ error: null });
    (prisma.users.update as any).mockRejectedValue(new Error("email duplicado en la base de datos"));

    await expect(
      updateSyncedUserEmail({
        usuarioId: "db-1",
        authId: "auth-1",
        emailActual: "viejo@example.com",
        nuevoEmail: "nuevo@example.com",
      })
    ).rejects.toThrow(/se revirtió el cambio en Auth/);

    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenNthCalledWith(1, "auth-1", {
      email: "nuevo@example.com",
    });
    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenNthCalledWith(2, "auth-1", {
      email: "viejo@example.com",
    });
  });
});

describe("resetSyncedUserPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("llama a Auth con el authId y la contraseña nueva recibidos", async () => {
    (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({ error: null });

    await resetSyncedUserPassword({ authId: "auth-1", nuevoPassword: "clave-nueva-123" });

    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith("auth-1", {
      password: "clave-nueva-123",
    });
  });

  it("no toca Prisma en ningun caso: la contraseña no vive en la tabla Users", async () => {
    (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({ error: null });

    await resetSyncedUserPassword({ authId: "auth-1", nuevoPassword: "clave-nueva-123" });

    expect(prisma.users.update).not.toHaveBeenCalled();
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it("lanza un error si falla la actualizacion en Auth", async () => {
    (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({
      error: { message: "No se pudo actualizar" },
    });

    await expect(
      resetSyncedUserPassword({ authId: "auth-1", nuevoPassword: "clave-nueva-123" })
    ).rejects.toThrow(/No se pudo restablecer la contraseña en Supabase Auth/);
  });
});

describe("setSyncedUserActiveState (US20/US23)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lanza un error si el usuario no tiene authId vinculado", async () => {
    await expect(
      setSyncedUserActiveState({ usuarioId: "db-1", authId: null, activar: false })
    ).rejects.toThrow(/no tiene una cuenta de Supabase Auth vinculada/);

    expect(supabaseAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it("desactiva: banea en Auth y marca INACTIVO en Users", async () => {
    (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({ error: null });
    (prisma.users.update as any).mockResolvedValue({ id: "db-1", estado: "INACTIVO" });

    await setSyncedUserActiveState({ usuarioId: "db-1", authId: "auth-1", activar: false });

    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith("auth-1", {
      ban_duration: "876000h",
    });
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: "db-1" },
      data: { estado: "INACTIVO" },
    });
  });

  it("reactiva: quita el baneo en Auth y marca ACTIVO en Users", async () => {
    (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({ error: null });
    (prisma.users.update as any).mockResolvedValue({ id: "db-1", estado: "ACTIVO" });

    await setSyncedUserActiveState({ usuarioId: "db-1", authId: "auth-1", activar: true });

    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith("auth-1", {
      ban_duration: "none",
    });
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: "db-1" },
      data: { estado: "ACTIVO" },
    });
  });

  it("lanza un error y no toca Prisma si falla la actualizacion en Auth", async () => {
    (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({
      error: { message: "No se pudo banear" },
    });

    await expect(
      setSyncedUserActiveState({ usuarioId: "db-1", authId: "auth-1", activar: false })
    ).rejects.toThrow(/No se pudo actualizar el acceso en Supabase Auth/);

    expect(prisma.users.update).not.toHaveBeenCalled();
  });

  it("revierte el baneo en Auth si falla el guardado en Users", async () => {
    (supabaseAdmin.auth.admin.updateUserById as any).mockResolvedValue({ error: null });
    (prisma.users.update as any).mockRejectedValue(new Error("fallo de base de datos"));

    await expect(
      setSyncedUserActiveState({ usuarioId: "db-1", authId: "auth-1", activar: false })
    ).rejects.toThrow(/se revirtió el cambio en Auth/);

    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenNthCalledWith(1, "auth-1", {
      ban_duration: "876000h",
    });
    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenNthCalledWith(2, "auth-1", {
      ban_duration: "none",
    });
  });
});
