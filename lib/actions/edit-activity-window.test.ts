/**
 * Cambiar las dos fechas de una actividad ya creada (26/11/2026).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    actividades: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { editarVentanaDeActividad } from "./edit-activity-window";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function mockSesion(rol: string | null) {
  (createClient as any).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: rol ? { id: "auth-1" } : null } }),
    },
  });
  if (rol) {
    (prisma.users.findUnique as any).mockResolvedValue({ id: "tutor-1", rol });
  }
}

function formData(campos: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("actividadId", "act-1");
  fd.set("fechaLimite", "2026-12-04T23:00");
  fd.set("fechaCierre", "2026-12-06T23:00");
  for (const [clave, valor] of Object.entries(campos)) fd.set(clave, valor);
  return fd;
}

describe("editarVentanaDeActividad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesion("TUTOR");
    (prisma.actividades.findUnique as any).mockResolvedValue({
      id: "act-1",
      courseId: "curso-1",
      course: { tutorId: "tutor-1" },
    });
    (prisma.actividades.update as any).mockResolvedValue({ id: "act-1" });
  });

  it("rechaza si no hay sesión", async () => {
    mockSesion(null);

    const r = await editarVentanaDeActividad(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.actividades.update).not.toHaveBeenCalled();
  });

  it("rechaza a quien no es Tutor", async () => {
    mockSesion("ESTUDIANTE");

    const r = await editarVentanaDeActividad(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.actividades.update).not.toHaveBeenCalled();
  });

  it("RECHAZA la actividad de un curso de otro tutor", async () => {
    // Sin esta guarda, conocer el id bastaría para mover el plazo del curso
    // de otro docente.
    (prisma.actividades.findUnique as any).mockResolvedValue({
      id: "act-1",
      courseId: "curso-1",
      course: { tutorId: "otro-tutor" },
    });

    const r = await editarVentanaDeActividad(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.actividades.update).not.toHaveBeenCalled();
  });

  it("rechaza una actividad que no existe", async () => {
    (prisma.actividades.findUnique as any).mockResolvedValue(null);

    const r = await editarVentanaDeActividad(null, formData());

    expect(r.success).toBe(false);
    expect(prisma.actividades.update).not.toHaveBeenCalled();
  });

  it("guarda las dos fechas", async () => {
    const r = await editarVentanaDeActividad(null, formData());

    expect(r.success).toBe(true);
    const datos = (prisma.actividades.update as any).mock.calls[0][0].data;
    expect(datos.fechaLimite).toEqual(new Date("2026-12-04T23:00"));
    expect(datos.fechaCierre).toEqual(new Date("2026-12-06T23:00"));
  });

  it("un campo vacío BORRA la fecha, no la deja como estaba", async () => {
    // Es la única forma de volver atrás después de poner una fecha por error.
    const r = await editarVentanaDeActividad(
      null,
      formData({ fechaLimite: "", fechaCierre: "" })
    );

    expect(r.success).toBe(true);
    expect((prisma.actividades.update as any).mock.calls[0][0].data).toEqual({
      fechaLimite: null,
      fechaCierre: null,
    });
  });

  it("acepta un cierre sin vencimiento", async () => {
    const r = await editarVentanaDeActividad(null, formData({ fechaLimite: "" }));

    expect(r.success).toBe(true);
  });

  it("RECHAZA un cierre anterior al vencimiento", async () => {
    // Dejaría una actividad donde entregar a tiempo ya es imposible — misma
    // comprobación que al crearla (US52).
    const r = await editarVentanaDeActividad(
      null,
      formData({ fechaLimite: "2026-12-06T23:00", fechaCierre: "2026-12-04T23:00" })
    );

    expect(r.success).toBe(false);
    expect(prisma.actividades.update).not.toHaveBeenCalled();
  });

  it("rechaza una fecha que no se puede interpretar", async () => {
    const r = await editarVentanaDeActividad(null, formData({ fechaCierre: "el viernes" }));

    expect(r.success).toBe(false);
    expect(prisma.actividades.update).not.toHaveBeenCalled();
  });

  it("solo escribe las dos fechas, nada más de la actividad", async () => {
    await editarVentanaDeActividad(null, formData());

    expect(Object.keys((prisma.actividades.update as any).mock.calls[0][0].data).sort()).toEqual([
      "fechaCierre",
      "fechaLimite",
    ]);
  });

  it("informa el error y lo registra si falla el guardado", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    (prisma.actividades.update as any).mockRejectedValue(new Error("se cayó la base"));

    const r = await editarVentanaDeActividad(null, formData());

    expect(r.success).toBe(false);
    expect(consola).toHaveBeenCalled();
    consola.mockRestore();
  });
});
