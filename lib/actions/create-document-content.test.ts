import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
    },
    courses: {
      findUnique: vi.fn(),
    },
    contents: {
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase/storage", () => ({
  esTipoDocumentoPermitido: vi.fn(),
  subirDocumentoAStorage: vi.fn(),
  eliminarDocumentoDeStorage: vi.fn(),
  MAX_TAMANO_DOCUMENTO_BYTES: 10 * 1024 * 1024,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { subirDocumento } from "./create-document-content";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  esTipoDocumentoPermitido,
  subirDocumentoAStorage,
  eliminarDocumentoDeStorage,
} from "@/lib/supabase/storage";

function buildFile(name: string, type: string, sizeBytes = 1024) {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

function buildFormData(data: Record<string, string>, archivo?: File) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.set(k, v));
  if (archivo) fd.set("archivo", archivo);
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

const datosBase = { courseId: "curso-1", titulo: "Guía de estudio" };

describe("subirDocumento (US09)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesion activa", async () => {
    mockSesion(null);

    const resultado = await subirDocumento(
      null,
      buildFormData(datosBase, buildFile("a.pdf", "application/pdf"))
    );

    expect(resultado.success).toBe(false);
    expect(subirDocumentoAStorage).not.toHaveBeenCalled();
  });

  it("rechaza si quien llama no es Tutor", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "ADMINISTRADOR" });

    const resultado = await subirDocumento(
      null,
      buildFormData(datosBase, buildFile("a.pdf", "application/pdf"))
    );

    expect(resultado.success).toBe(false);
    expect(subirDocumentoAStorage).not.toHaveBeenCalled();
  });

  it("rechaza si no se adjunta ningun archivo", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR" });

    const resultado = await subirDocumento(null, buildFormData(datosBase));

    expect(resultado.success).toBe(false);
    expect(subirDocumentoAStorage).not.toHaveBeenCalled();
  });

  it("rechaza un tipo de archivo no permitido", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR" });
    (esTipoDocumentoPermitido as any).mockReturnValue(false);

    const resultado = await subirDocumento(
      null,
      buildFormData(datosBase, buildFile("imagen.png", "image/png"))
    );

    expect(resultado.success).toBe(false);
    expect(subirDocumentoAStorage).not.toHaveBeenCalled();
  });

  it("rechaza un archivo que supera el limite de tamaño", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR" });
    (esTipoDocumentoPermitido as any).mockReturnValue(true);

    const archivoGrande = buildFile("grande.pdf", "application/pdf", 11 * 1024 * 1024);

    const resultado = await subirDocumento(null, buildFormData(datosBase, archivoGrande));

    expect(resultado.success).toBe(false);
    expect(subirDocumentoAStorage).not.toHaveBeenCalled();
  });

  it("rechaza si el curso no existe o no pertenece al tutor", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR", id: "tutor-1" });
    (esTipoDocumentoPermitido as any).mockReturnValue(true);
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      tutorId: "otro-tutor",
    });

    const resultado = await subirDocumento(
      null,
      buildFormData(datosBase, buildFile("a.pdf", "application/pdf"))
    );

    expect(resultado.success).toBe(false);
    expect(subirDocumentoAStorage).not.toHaveBeenCalled();
  });

  it("sube el archivo y crea el contenido cuando todo es valido", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR", id: "tutor-1" });
    (esTipoDocumentoPermitido as any).mockReturnValue(true);
    (prisma.courses.findUnique as any).mockResolvedValue({ id: "curso-1", tutorId: "tutor-1" });
    (subirDocumentoAStorage as any).mockResolvedValue({ path: "curso-1/abc-guia.pdf" });
    (prisma.contents.count as any).mockResolvedValue(1);
    (prisma.contents.create as any).mockResolvedValue({ id: "contenido-1" });

    const archivo = buildFile("guia.pdf", "application/pdf");
    const resultado = await subirDocumento(null, buildFormData(datosBase, archivo));

    expect(resultado.success).toBe(true);
    expect(subirDocumentoAStorage).toHaveBeenCalledWith("curso-1", archivo);
    expect(prisma.contents.create).toHaveBeenCalledWith({
      data: {
        courseId: "curso-1",
        titulo: "Guía de estudio",
        descripcion: null,
        tipo: "DOCUMENTO",
        contenido: "curso-1/abc-guia.pdf",
        orden: 1,
        documentos: {
          create: {
            archivo: "curso-1/abc-guia.pdf",
            nombre: "guia.pdf",
            tipo: "application/pdf",
          },
        },
      },
    });
    expect(eliminarDocumentoDeStorage).not.toHaveBeenCalled();
  });

  it("propaga el error de Storage si la subida falla", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR", id: "tutor-1" });
    (esTipoDocumentoPermitido as any).mockReturnValue(true);
    (prisma.courses.findUnique as any).mockResolvedValue({ id: "curso-1", tutorId: "tutor-1" });
    (subirDocumentoAStorage as any).mockRejectedValue(new Error("bucket no existe"));

    const resultado = await subirDocumento(
      null,
      buildFormData(datosBase, buildFile("guia.pdf", "application/pdf"))
    );

    expect(resultado.success).toBe(false);
    expect(prisma.contents.create).not.toHaveBeenCalled();
  });

  it("borra el archivo de Storage si falla el guardado en la base de datos", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ rol: "TUTOR", id: "tutor-1" });
    (esTipoDocumentoPermitido as any).mockReturnValue(true);
    (prisma.courses.findUnique as any).mockResolvedValue({ id: "curso-1", tutorId: "tutor-1" });
    (subirDocumentoAStorage as any).mockResolvedValue({ path: "curso-1/abc-guia.pdf" });
    (prisma.contents.count as any).mockResolvedValue(0);
    (prisma.contents.create as any).mockRejectedValue(new Error("fallo db"));

    const resultado = await subirDocumento(
      null,
      buildFormData(datosBase, buildFile("guia.pdf", "application/pdf"))
    );

    expect(resultado.success).toBe(false);
    expect(eliminarDocumentoDeStorage).toHaveBeenCalledWith("curso-1/abc-guia.pdf");
  });
});
