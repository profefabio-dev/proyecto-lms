import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
    grupos: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    courses: { findUnique: vi.fn() },
    courseUsers: { findMany: vi.fn(), createMany: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn((ops) => Promise.all(ops)),
  },
}));

import {
  crearGrupo,
  renombrarGrupo,
  eliminarGrupo,
  asignarGrupoEstudiante,
  matricularGrupoEnCurso,
} from "./groups";
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

describe("Grupos Server Actions (US32)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("auth-tutor-1");
    (prisma.users.findUnique as any).mockResolvedValue({
      id: "tutor-1",
      rol: "TUTOR",
      espacioId: "espacio-1",
    });
  });

  describe("crearGrupo", () => {
    it("rechaza si no hay sesión activa", async () => {
      mockSesion(null);
      const fd = new FormData();
      fd.set("nombre", "6A");

      const res = await crearGrupo(null, fd);
      expect(res.success).toBe(false);
      expect(prisma.grupos.create).not.toHaveBeenCalled();
    });

    it("rechaza si el rol es ESTUDIANTE", async () => {
      (prisma.users.findUnique as any).mockResolvedValue({
        id: "est-1",
        rol: "ESTUDIANTE",
        espacioId: "espacio-1",
      });
      const fd = new FormData();
      fd.set("nombre", "6A");

      const res = await crearGrupo(null, fd);
      expect(res.success).toBe(false);
      expect(prisma.grupos.create).not.toHaveBeenCalled();
    });

    it("rechaza si el nombre está vacío", async () => {
      const fd = new FormData();
      fd.set("nombre", "   ");

      const res = await crearGrupo(null, fd);
      expect(res.success).toBe(false);
      expect(prisma.grupos.create).not.toHaveBeenCalled();
    });

    it("rechaza si ya existe un grupo con el mismo nombre en el espacio", async () => {
      (prisma.grupos.findUnique as any).mockResolvedValue({
        id: "g-existente",
        nombre: "6A",
        espacioId: "espacio-1",
      });
      const fd = new FormData();
      fd.set("nombre", "6a");

      const res = await crearGrupo(null, fd);
      expect(res.success).toBe(false);
      expect(res).toEqual({
        success: false,
        error: 'Ya existe un grupo con el nombre "6A" en tu colegio.',
      });
      expect(prisma.grupos.create).not.toHaveBeenCalled();
    });

    it("crea el grupo con nombre en mayúsculas si no existe", async () => {
      (prisma.grupos.findUnique as any).mockResolvedValue(null);
      (prisma.grupos.create as any).mockResolvedValue({ id: "g-nuevo", nombre: "6A" });

      const fd = new FormData();
      fd.set("nombre", "6a");

      const res = await crearGrupo(null, fd);
      expect(res.success).toBe(true);
      expect(prisma.grupos.create).toHaveBeenCalledWith({
        data: {
          nombre: "6A",
          espacioId: "espacio-1",
        },
      });
    });
  });

  describe("renombrarGrupo", () => {
    it("rechaza si el grupo pertenece a otro espacio", async () => {
      (prisma.grupos.findUnique as any).mockResolvedValue({
        id: "g-1",
        nombre: "6A",
        espacioId: "espacio-ajeno",
      });
      const fd = new FormData();
      fd.set("grupoId", "g-1");
      fd.set("nombre", "6B");

      const res = await renombrarGrupo(null, fd);
      expect(res.success).toBe(false);
      expect(res).toEqual({ success: false, error: "El grupo no existe o pertenece a otro colegio." });
    });

    it("renombra el grupo y sincroniza el grado en los estudiantes", async () => {
      (prisma.grupos.findUnique as any)
        .mockResolvedValueOnce({ id: "g-1", nombre: "6A", espacioId: "espacio-1" })
        .mockResolvedValueOnce(null); // sin colisión de nombre

      const fd = new FormData();
      fd.set("grupoId", "g-1");
      fd.set("nombre", "7A");

      const res = await renombrarGrupo(null, fd);
      expect(res.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("eliminarGrupo", () => {
    it("elimina el grupo si pertenece al espacio del usuario", async () => {
      (prisma.grupos.findUnique as any).mockResolvedValue({
        id: "g-1",
        nombre: "6A",
        espacioId: "espacio-1",
      });

      const fd = new FormData();
      fd.set("grupoId", "g-1");

      const res = await eliminarGrupo(null, fd);
      expect(res.success).toBe(true);
      expect(prisma.grupos.delete).toHaveBeenCalledWith({ where: { id: "g-1" } });
    });
  });

  // 27/11/2026: esta acción estaba importada en este archivo pero sin un solo
  // caso. Al revisarla apareció que **no comprobaba el estudiante**, solo el
  // grupo: con el id de un estudiante de otro colegio se lo podía meter a un
  // grupo propio. Estas pruebas fijan las dos guardas que se agregaron.
  describe("asignarGrupoEstudiante", () => {
    function fd(userId = "est-9", grupoId = "g-1") {
      const f = new FormData();
      f.set("userId", userId);
      f.set("grupoId", grupoId);
      return f;
    }

    beforeEach(() => {
      (prisma.grupos.findUnique as any).mockResolvedValue({
        id: "g-1",
        nombre: "6A",
        espacioId: "espacio-1",
      });
      (prisma.users.update as any).mockResolvedValue({ id: "est-9" });
    });

    it("RECHAZA a un estudiante de otro colegio", async () => {
      // El tutor es de "espacio-1"; este estudiante nació en otro espacio y
      // no tiene inscripciones acá.
      (prisma.users.findUnique as any)
        .mockResolvedValueOnce({ id: "tutor-1", rol: "TUTOR", espacioId: "espacio-1" })
        .mockResolvedValueOnce({
          id: "est-9",
          rol: "ESTUDIANTE",
          espacioId: null,
          espacioOrigenId: "espacio-de-otro-colegio",
        });
      (prisma.courseUsers.findFirst as any).mockResolvedValue(null);

      const res = await asignarGrupoEstudiante(null, fd());

      expect(res.success).toBe(false);
      expect(prisma.users.update).not.toHaveBeenCalled();
    });

    it("RECHAZA un id que no es de un estudiante", async () => {
      (prisma.users.findUnique as any)
        .mockResolvedValueOnce({ id: "tutor-1", rol: "TUTOR", espacioId: "espacio-1" })
        .mockResolvedValueOnce({
          id: "otro-tutor",
          rol: "TUTOR",
          espacioId: "espacio-1",
          espacioOrigenId: null,
        });

      const res = await asignarGrupoEstudiante(null, fd("otro-tutor"));

      expect(res.success).toBe(false);
      expect(prisma.users.update).not.toHaveBeenCalled();
    });

    it("rechaza un grupo de otro colegio", async () => {
      (prisma.users.findUnique as any).mockResolvedValueOnce({
        id: "tutor-1",
        rol: "TUTOR",
        espacioId: "espacio-1",
      });
      (prisma.grupos.findUnique as any).mockResolvedValue({
        id: "g-ajeno",
        nombre: "6A",
        espacioId: "espacio-2",
      });

      const res = await asignarGrupoEstudiante(null, fd("est-9", "g-ajeno"));

      expect(res.success).toBe(false);
      expect(prisma.users.update).not.toHaveBeenCalled();
    });

    it("asigna el grupo a un estudiante del propio espacio", async () => {
      (prisma.users.findUnique as any)
        .mockResolvedValueOnce({ id: "tutor-1", rol: "TUTOR", espacioId: "espacio-1" })
        .mockResolvedValueOnce({
          id: "est-9",
          rol: "ESTUDIANTE",
          espacioId: null,
          espacioOrigenId: "espacio-1",
        });

      const res = await asignarGrupoEstudiante(null, fd());

      expect(res.success).toBe(true);
      expect((prisma.users.update as any).mock.calls[0][0].data).toEqual({
        grupoId: "g-1",
        grado: "6A",
      });
    });

    it("acepta a un estudiante de otro espacio que SÍ está inscrito acá (US26)", async () => {
      // Un estudiante puede estar en cursos de dos colegios: si tiene una
      // inscripción en este espacio, es visible y se le puede poner grupo.
      (prisma.users.findUnique as any)
        .mockResolvedValueOnce({ id: "tutor-1", rol: "TUTOR", espacioId: "espacio-1" })
        .mockResolvedValueOnce({
          id: "est-9",
          rol: "ESTUDIANTE",
          espacioId: null,
          espacioOrigenId: "otro-espacio",
        });
      (prisma.courseUsers.findFirst as any).mockResolvedValue({ id: "insc-1" });

      const res = await asignarGrupoEstudiante(null, fd());

      expect(res.success).toBe(true);
    });

    it("quitar el grupo (sin grupoId) deja la cuenta sin grupo", async () => {
      (prisma.users.findUnique as any)
        .mockResolvedValueOnce({ id: "tutor-1", rol: "TUTOR", espacioId: "espacio-1" })
        .mockResolvedValueOnce({
          id: "est-9",
          rol: "ESTUDIANTE",
          espacioId: null,
          espacioOrigenId: "espacio-1",
        });

      const f = new FormData();
      f.set("userId", "est-9");
      f.set("grupoId", "");

      const res = await asignarGrupoEstudiante(null, f);

      expect(res.success).toBe(true);
      expect((prisma.users.update as any).mock.calls[0][0].data).toEqual({
        grupoId: null,
        grado: null,
      });
    });
  });

  describe("matricularGrupoEnCurso", () => {
    it("rechaza si el curso pertenece a otro tutor o espacio", async () => {
      (prisma.courses.findUnique as any).mockResolvedValue({
        id: "c-1",
        tutorId: "otro-tutor",
        tutor: { espacioId: "espacio-ajeno" },
      });

      const fd = new FormData();
      fd.set("courseId", "c-1");
      fd.set("grupoId", "g-1");

      const res = await matricularGrupoEnCurso(null, fd);
      expect(res.success).toBe(false);
      expect(prisma.courseUsers.createMany).not.toHaveBeenCalled();
    });

    it("matricula solo a los estudiantes que no estaban inscritos", async () => {
      (prisma.courses.findUnique as any).mockResolvedValue({
        id: "c-1",
        titulo: "Informática 6°",
        tutorId: "tutor-1",
        tutor: { espacioId: "espacio-1" },
      });
      (prisma.grupos.findUnique as any).mockResolvedValue({
        id: "g-1",
        nombre: "6A",
        espacioId: "espacio-1",
      });
      (prisma.users.findMany as any).mockResolvedValue([
        { id: "est-1" },
        { id: "est-2" },
        { id: "est-3" },
      ]);
      // est-1 ya estaba inscrito
      (prisma.courseUsers.findMany as any).mockResolvedValue([{ userId: "est-1" }]);
      (prisma.courseUsers.createMany as any).mockResolvedValue({ count: 2 });

      const fd = new FormData();
      fd.set("courseId", "c-1");
      fd.set("grupoId", "g-1");

      const res = await matricularGrupoEnCurso(null, fd);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.matriculados).toBe(2);
        expect(res.yaInscritos).toBe(1);
      }
      expect(prisma.courseUsers.createMany).toHaveBeenCalledWith({
        data: [{ courseId: "c-1", userId: "est-2" }, { courseId: "c-1", userId: "est-3" }],
        skipDuplicates: true,
      });
    });
  });
});
