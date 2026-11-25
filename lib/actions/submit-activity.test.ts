/**
 * Pruebas de `entregarActividad`.
 *
 * La acción existe desde US37 (19/11/2026) y **no tenía ninguna prueba**: la
 * épica de Evaluación se construyó sin cubrir estas dos acciones. Se empieza
 * por lo que US52 agrega —la fecha de cierre y el tipo de entrega exigido—
 * porque la de cierre es una guarda de verdad, del mismo tipo que el límite
 * de intentos de OP08: ocultar el botón no impide reenviar la petición. Se
 * cubren además las guardas que ya existían, para no dejarlas sin red.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/storage", () => ({
  subirDocumentoAStorage: vi.fn(),
  eliminarDocumentoDeStorage: vi.fn(),
  MAX_TAMANO_DOCUMENTO_BYTES: 10 * 1024 * 1024,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    actividades: { findUnique: vi.fn() },
    courseUsers: { findFirst: vi.fn() },
    entregas: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

import { entregarActividad } from "./submit-activity";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const AYER = new Date(Date.now() - 24 * 60 * 60 * 1000);
const MANANA = new Date(Date.now() + 24 * 60 * 60 * 1000);

function mockSesionEstudiante(rol = "ESTUDIANTE") {
  (createClient as any).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
  });
  (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol });
}

/** Una actividad abierta, sin cierre y que acepta cualquiera de las dos cosas. */
function actividad(extra: Record<string, unknown> = {}) {
  return {
    id: "act-1",
    courseId: "curso-1",
    visible: true,
    fechaLimite: null,
    fechaCierre: null,
    tipoEntrega: "AMBOS",
    ...extra,
  };
}

function formData(campos: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("actividadId", "act-1");
  for (const [clave, valor] of Object.entries(campos)) fd.set(clave, valor);
  return fd;
}

describe("entregarActividad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSesionEstudiante();
    (prisma.actividades.findUnique as any).mockResolvedValue(actividad());
    (prisma.courseUsers.findFirst as any).mockResolvedValue({ id: "insc-1" });
    (prisma.entregas.findUnique as any).mockResolvedValue(null);
    (prisma.entregas.upsert as any).mockResolvedValue({});
  });

  // ---- Guardas que ya existían ----

  it("rechaza si no hay sesión", async () => {
    (createClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    const r = await entregarActividad(null, formData({ texto: "mi respuesta" }));

    expect(r.success).toBe(false);
    expect(prisma.entregas.upsert).not.toHaveBeenCalled();
  });

  it("rechaza a quien no es Estudiante", async () => {
    mockSesionEstudiante("TUTOR");

    const r = await entregarActividad(null, formData({ texto: "mi respuesta" }));

    expect(r.success).toBe(false);
    expect(prisma.entregas.upsert).not.toHaveBeenCalled();
  });

  it("rechaza una actividad oculta", async () => {
    (prisma.actividades.findUnique as any).mockResolvedValue(actividad({ visible: false }));

    const r = await entregarActividad(null, formData({ texto: "mi respuesta" }));

    expect(r).toEqual({ success: false, error: "Esta actividad no está disponible." });
  });

  it("rechaza a quien no está inscrito en el curso", async () => {
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);

    const r = await entregarActividad(null, formData({ texto: "mi respuesta" }));

    expect(r.success).toBe(false);
    expect(prisma.entregas.upsert).not.toHaveBeenCalled();
  });

  it("entrega con texto cuando todo está en orden", async () => {
    const r = await entregarActividad(null, formData({ texto: "mi respuesta" }));

    expect(r).toEqual({ success: true });
    expect(prisma.entregas.upsert).toHaveBeenCalled();
  });

  // ---- US52: la fecha de cierre ----

  it("RECHAZA la entrega si la actividad ya cerró, aunque el formulario llegue igual", async () => {
    (prisma.actividades.findUnique as any).mockResolvedValue(
      actividad({ fechaLimite: AYER, fechaCierre: AYER })
    );

    const r = await entregarActividad(null, formData({ texto: "mi respuesta" }));

    expect(r).toEqual({
      success: false,
      error: "Esta actividad ya cerró y no acepta más entregas.",
    });
    expect(prisma.entregas.upsert).not.toHaveBeenCalled();
  });

  it("sigue aceptando una entrega tardía cuando NO hay fecha de cierre", async () => {
    // La decisión del 19/11/2026 no cambia: pasada la fecha límite se recibe
    // y se marca fuera de plazo. Solo el cierre bloquea.
    (prisma.actividades.findUnique as any).mockResolvedValue(actividad({ fechaLimite: AYER }));

    const r = await entregarActividad(null, formData({ texto: "mi respuesta" }));

    expect(r).toEqual({ success: true });
    expect(prisma.entregas.upsert).toHaveBeenCalled();
  });

  it("acepta entre el vencimiento y el cierre", async () => {
    (prisma.actividades.findUnique as any).mockResolvedValue(
      actividad({ fechaLimite: AYER, fechaCierre: MANANA })
    );

    const r = await entregarActividad(null, formData({ texto: "mi respuesta" }));

    expect(r).toEqual({ success: true });
  });

  // ---- US52: el tipo exigido ----

  it("con SOLO_ARCHIVO, un texto suelto no es una entrega", async () => {
    (prisma.actividades.findUnique as any).mockResolvedValue(
      actividad({ tipoEntrega: "SOLO_ARCHIVO" })
    );

    const r = await entregarActividad(null, formData({ texto: "mi respuesta" }));

    expect(r).toEqual({
      success: false,
      error: "Esta actividad se entrega adjuntando un archivo.",
    });
    expect(prisma.entregas.upsert).not.toHaveBeenCalled();
  });

  it("con SOLO_TEXTO, exige la respuesta escrita", async () => {
    (prisma.actividades.findUnique as any).mockResolvedValue(
      actividad({ tipoEntrega: "SOLO_TEXTO" })
    );

    const r = await entregarActividad(null, formData());

    expect(r).toEqual({
      success: false,
      error: "Esta actividad se entrega escribiendo tu respuesta.",
    });
  });

  it("con SOLO_ARCHIVO, vale el archivo que ya tenía de una entrega anterior", async () => {
    // No debe obligarlo a volver a subirlo solo por corregir algo.
    (prisma.actividades.findUnique as any).mockResolvedValue(
      actividad({ tipoEntrega: "SOLO_ARCHIVO" })
    );
    (prisma.entregas.findUnique as any).mockResolvedValue({
      archivo: "entregas/act-1/previo.pdf",
      nombreArchivo: "previo.pdf",
    });

    const r = await entregarActividad(null, formData());

    expect(r).toEqual({ success: true });
  });

  it("una entrega vacía sigue sin valer", async () => {
    const r = await entregarActividad(null, formData());

    expect(r).toEqual({ success: false, error: "Escribe tu respuesta o adjunta un archivo." });
  });
});
