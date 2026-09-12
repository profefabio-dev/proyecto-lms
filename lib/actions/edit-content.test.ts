import { describe, it, expect, vi, beforeEach } from "vitest";
import { editarContenido } from "./edit-content";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  esTipoDocumentoPermitido,
  subirDocumentoAStorage,
  eliminarDocumentoDeStorage,
} from "@/lib/supabase/storage";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    contents: { findUnique: vi.fn(), update: vi.fn() },
    documents: { update: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/supabase/storage", () => ({
  esTipoDocumentoPermitido: vi.fn(),
  subirDocumentoAStorage: vi.fn(),
  eliminarDocumentoDeStorage: vi.fn(),
  MAX_TAMANO_DOCUMENTO_BYTES: 10 * 1024 * 1024,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function buildFormData(data: Record<string, string>, archivo?: File) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.append(k, v));
  if (archivo) fd.set("archivo", archivo);
  return fd;
}

function buildFile(name: string, type: string, sizeBytes = 1024) {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

function mockSesionTutor() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
  } as any);
  vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "tutor-1", rol: "TUTOR" } as any);
}

const datosBase = { contentId: "contenido-1", titulo: "Título corregido", descripcion: "Descripción" };

describe("editarContenido (OP06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesión", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const resultado = await editarContenido(null, buildFormData(datosBase));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el usuario no es tutor", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "ESTUDIANTE" } as any);

    const resultado = await editarContenido(null, buildFormData(datosBase));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el contenido no existe", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue(null);

    const resultado = await editarContenido(null, buildFormData(datosBase));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el curso del contenido no pertenece al tutor", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "contenido-1",
      courseId: "curso-1",
      tipo: "VIDEO",
      course: { id: "curso-1", tutorId: "otro-tutor" },
      documentos: [],
    } as any);

    const resultado = await editarContenido(null, buildFormData(datosBase));

    expect(resultado.success).toBe(false);
  });

  it("VIDEO: rechaza una URL que no es de YouTube", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "contenido-1",
      courseId: "curso-1",
      tipo: "VIDEO",
      course: { id: "curso-1", tutorId: "tutor-1" },
      documentos: [],
    } as any);

    const resultado = await editarContenido(
      null,
      buildFormData({ ...datosBase, url: "https://vimeo.com/123" })
    );

    expect(resultado.success).toBe(false);
    expect(prisma.contents.update).not.toHaveBeenCalled();
  });

  it("VIDEO: guarda título, descripción y la URL nueva", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "contenido-1",
      courseId: "curso-1",
      tipo: "VIDEO",
      course: { id: "curso-1", tutorId: "tutor-1" },
      documentos: [],
    } as any);
    vi.mocked(prisma.contents.update).mockResolvedValue({} as any);

    const resultado = await editarContenido(
      null,
      buildFormData({ ...datosBase, url: "https://www.youtube.com/watch?v=abc123" })
    );

    expect(resultado.success).toBe(true);
    expect(prisma.contents.update).toHaveBeenCalledWith({
      where: { id: "contenido-1" },
      data: {
        titulo: "Título corregido",
        descripcion: "Descripción",
        contenido: "https://www.youtube.com/watch?v=abc123",
      },
    });
  });

  it("TEXTO: rechaza un contenido demasiado corto", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "contenido-1",
      courseId: "curso-1",
      tipo: "TEXTO",
      course: { id: "curso-1", tutorId: "tutor-1" },
      documentos: [],
    } as any);

    const resultado = await editarContenido(null, buildFormData({ ...datosBase, contenido: "a" }));

    expect(resultado.success).toBe(false);
    expect(prisma.contents.update).not.toHaveBeenCalled();
  });

  it("TEXTO: guarda título, descripción y el contenido Markdown nuevo", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "contenido-1",
      courseId: "curso-1",
      tipo: "TEXTO",
      course: { id: "curso-1", tutorId: "tutor-1" },
      documentos: [],
    } as any);
    vi.mocked(prisma.contents.update).mockResolvedValue({} as any);

    const resultado = await editarContenido(
      null,
      buildFormData({ ...datosBase, contenido: "# Corregido\n\nTexto nuevo" })
    );

    expect(resultado.success).toBe(true);
    expect(prisma.contents.update).toHaveBeenCalledWith({
      where: { id: "contenido-1" },
      data: {
        titulo: "Título corregido",
        descripcion: "Descripción",
        contenido: "# Corregido\n\nTexto nuevo",
      },
    });
  });

  it("DOCUMENTO: sin archivo nuevo, guarda solo título y descripción", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "contenido-1",
      courseId: "curso-1",
      tipo: "DOCUMENTO",
      course: { id: "curso-1", tutorId: "tutor-1" },
      documentos: [{ id: "doc-1", archivo: "curso-1/viejo.pdf", nombre: "viejo.pdf", tipo: "application/pdf" }],
    } as any);
    vi.mocked(prisma.contents.update).mockResolvedValue({} as any);

    const resultado = await editarContenido(null, buildFormData(datosBase));

    expect(resultado.success).toBe(true);
    expect(prisma.contents.update).toHaveBeenCalledWith({
      where: { id: "contenido-1" },
      data: { titulo: "Título corregido", descripcion: "Descripción" },
    });
    expect(subirDocumentoAStorage).not.toHaveBeenCalled();
  });

  it("DOCUMENTO: rechaza un archivo nuevo con un tipo no permitido", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "contenido-1",
      courseId: "curso-1",
      tipo: "DOCUMENTO",
      course: { id: "curso-1", tutorId: "tutor-1" },
      documentos: [{ id: "doc-1", archivo: "curso-1/viejo.pdf", nombre: "viejo.pdf", tipo: "application/pdf" }],
    } as any);
    (esTipoDocumentoPermitido as any).mockReturnValue(false);

    const resultado = await editarContenido(
      null,
      buildFormData(datosBase, buildFile("nuevo.gif", "image/gif"))
    );

    expect(resultado.success).toBe(false);
    expect(subirDocumentoAStorage).not.toHaveBeenCalled();
  });

  it("DOCUMENTO: rechaza un archivo nuevo que supera el límite de tamaño", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "contenido-1",
      courseId: "curso-1",
      tipo: "DOCUMENTO",
      course: { id: "curso-1", tutorId: "tutor-1" },
      documentos: [{ id: "doc-1", archivo: "curso-1/viejo.pdf", nombre: "viejo.pdf", tipo: "application/pdf" }],
    } as any);
    (esTipoDocumentoPermitido as any).mockReturnValue(true);

    const archivoGrande = buildFile("grande.pdf", "application/pdf", 11 * 1024 * 1024);
    const resultado = await editarContenido(null, buildFormData(datosBase, archivoGrande));

    expect(resultado.success).toBe(false);
    expect(subirDocumentoAStorage).not.toHaveBeenCalled();
  });

  it("DOCUMENTO: reemplaza el archivo, actualiza en una transacción y borra el anterior de Storage", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "contenido-1",
      courseId: "curso-1",
      tipo: "DOCUMENTO",
      course: { id: "curso-1", tutorId: "tutor-1" },
      documentos: [{ id: "doc-1", archivo: "curso-1/viejo.pdf", nombre: "viejo.pdf", tipo: "application/pdf" }],
    } as any);
    (esTipoDocumentoPermitido as any).mockReturnValue(true);
    (subirDocumentoAStorage as any).mockResolvedValue({ path: "curso-1/nuevo.pdf" });
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as any);
    (eliminarDocumentoDeStorage as any).mockResolvedValue(undefined);

    const archivo = buildFile("nuevo.pdf", "application/pdf");
    const resultado = await editarContenido(null, buildFormData(datosBase, archivo));

    expect(resultado.success).toBe(true);
    expect(subirDocumentoAStorage).toHaveBeenCalledWith("curso-1", archivo);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(eliminarDocumentoDeStorage).toHaveBeenCalledWith("curso-1/viejo.pdf");
  });

  it("DOCUMENTO: si falla la transacción, borra el archivo recién subido y conserva el anterior", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "contenido-1",
      courseId: "curso-1",
      tipo: "DOCUMENTO",
      course: { id: "curso-1", tutorId: "tutor-1" },
      documentos: [{ id: "doc-1", archivo: "curso-1/viejo.pdf", nombre: "viejo.pdf", tipo: "application/pdf" }],
    } as any);
    (esTipoDocumentoPermitido as any).mockReturnValue(true);
    (subirDocumentoAStorage as any).mockResolvedValue({ path: "curso-1/nuevo.pdf" });
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("fallo db"));

    const resultado = await editarContenido(
      null,
      buildFormData(datosBase, buildFile("nuevo.pdf", "application/pdf"))
    );

    expect(resultado.success).toBe(false);
    expect(eliminarDocumentoDeStorage).toHaveBeenCalledWith("curso-1/nuevo.pdf");
    expect(eliminarDocumentoDeStorage).not.toHaveBeenCalledWith("curso-1/viejo.pdf");
  });

  it("propaga el error si la actualización en la base de datos falla (video)", async () => {
    mockSesionTutor();
    vi.mocked(prisma.contents.findUnique).mockResolvedValue({
      id: "contenido-1",
      courseId: "curso-1",
      tipo: "VIDEO",
      course: { id: "curso-1", tutorId: "tutor-1" },
      documentos: [],
    } as any);
    vi.mocked(prisma.contents.update).mockRejectedValue(new Error("fallo db"));

    const resultado = await editarContenido(
      null,
      buildFormData({ ...datosBase, url: "https://youtu.be/abc123" })
    );

    expect(resultado.success).toBe(false);
  });
});
