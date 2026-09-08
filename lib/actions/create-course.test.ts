import { describe, it, expect, vi, beforeEach } from "vitest";
import { crearCurso } from "./create-course";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  esTipoImagenPermitido,
  subirImagenCursoAStorage,
  eliminarImagenCursoDeStorage,
} from "@/lib/supabase/storage";

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/prisma", () => ({
  prisma: { users: { findUnique: vi.fn() }, courses: { create: vi.fn() } },
}));
vi.mock("@/lib/supabase/storage", () => ({
  esTipoImagenPermitido: vi.fn(),
  subirImagenCursoAStorage: vi.fn(),
  eliminarImagenCursoDeStorage: vi.fn(),
  MAX_TAMANO_IMAGEN_BYTES: 5 * 1024 * 1024,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function buildFormData(data: Record<string, string>, archivoImagen?: File) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.append(k, v));
  if (archivoImagen) fd.set("imagenArchivo", archivoImagen);
  return fd;
}

function buildFile(name: string, type: string, sizeBytes = 1024) {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

const datosValidos = {
  titulo: "Introducción a la Programación",
  descripcion: "Curso básico de programación para principiantes",
  imagenUrl: "https://example.com/imagen.png",
  estado: "BORRADOR",
};

describe("crearCurso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si no hay sesión", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any);

    const resultado = await crearCurso(null, buildFormData(datosValidos));

    expect(resultado.success).toBe(false);
  });

  it("rechaza si el usuario no es tutor", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "ESTUDIANTE" } as any);

    const resultado = await crearCurso(null, buildFormData(datosValidos));

    expect(resultado.success).toBe(false);
  });

  it("rechaza datos inválidos (imagenUrl no es una URL)", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "TUTOR" } as any);

    const resultado = await crearCurso(
      null,
      buildFormData({ ...datosValidos, imagenUrl: "no-es-una-url" })
    );

    expect(resultado.success).toBe(false);
  });

  it("rechaza si no se sube un archivo ni se pega una URL de imagen", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "TUTOR" } as any);

    const resultado = await crearCurso(
      null,
      buildFormData({ ...datosValidos, imagenUrl: "" })
    );

    expect(resultado.success).toBe(false);
    expect(subirImagenCursoAStorage).not.toHaveBeenCalled();
  });

  it("crea el curso cuando el tutor está autenticado y los datos son válidos", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "TUTOR" } as any);
    vi.mocked(prisma.courses.create).mockResolvedValue({ id: "curso-1" } as any);

    const resultado = await crearCurso(
      null,
      buildFormData({ ...datosValidos, estado: "PUBLICADO" })
    );

    expect(resultado.success).toBe(true);
    expect(prisma.courses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          titulo: datosValidos.titulo,
          tutorId: "u1",
          estado: "PUBLICADO",
        }),
      })
    );
  });

  it("propaga el error si la base de datos falla", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "TUTOR" } as any);
    vi.mocked(prisma.courses.create).mockRejectedValue(new Error("fallo db"));

    const resultado = await crearCurso(null, buildFormData(datosValidos));

    expect(resultado.success).toBe(false);
  });

  it("sube la imagen a Storage y crea el curso cuando se adjunta un archivo", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "TUTOR" } as any);
    (esTipoImagenPermitido as any).mockReturnValue(true);
    (subirImagenCursoAStorage as any).mockResolvedValue({
      path: "abc-portada.png",
      url: "https://storage.test/imagenes-cursos/abc-portada.png",
    });
    vi.mocked(prisma.courses.create).mockResolvedValue({ id: "curso-1" } as any);

    const archivo = buildFile("portada.png", "image/png");
    const resultado = await crearCurso(
      null,
      buildFormData({ ...datosValidos, imagenUrl: "" }, archivo)
    );

    expect(resultado.success).toBe(true);
    expect(subirImagenCursoAStorage).toHaveBeenCalledWith(archivo);
    expect(prisma.courses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imagen: "https://storage.test/imagenes-cursos/abc-portada.png",
        }),
      })
    );
  });

  it("prioriza el archivo subido sobre la URL cuando se dan ambos", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "TUTOR" } as any);
    (esTipoImagenPermitido as any).mockReturnValue(true);
    (subirImagenCursoAStorage as any).mockResolvedValue({
      path: "abc-portada.png",
      url: "https://storage.test/imagenes-cursos/abc-portada.png",
    });
    vi.mocked(prisma.courses.create).mockResolvedValue({ id: "curso-1" } as any);

    const resultado = await crearCurso(
      null,
      buildFormData(datosValidos, buildFile("portada.png", "image/png"))
    );

    expect(resultado.success).toBe(true);
    expect(subirImagenCursoAStorage).toHaveBeenCalled();
  });

  it("rechaza un archivo de imagen con un tipo no permitido", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "TUTOR" } as any);
    (esTipoImagenPermitido as any).mockReturnValue(false);

    const archivo = buildFile("portada.gif", "image/gif");
    const resultado = await crearCurso(
      null,
      buildFormData({ ...datosValidos, imagenUrl: "" }, archivo)
    );

    expect(resultado.success).toBe(false);
    expect(subirImagenCursoAStorage).not.toHaveBeenCalled();
  });

  it("rechaza un archivo de imagen que supera el límite de tamaño", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "TUTOR" } as any);
    (esTipoImagenPermitido as any).mockReturnValue(true);

    const archivoGrande = buildFile("grande.png", "image/png", 6 * 1024 * 1024);
    const resultado = await crearCurso(
      null,
      buildFormData({ ...datosValidos, imagenUrl: "" }, archivoGrande)
    );

    expect(resultado.success).toBe(false);
    expect(subirImagenCursoAStorage).not.toHaveBeenCalled();
  });

  it("propaga el error de Storage si la subida de la imagen falla", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "TUTOR" } as any);
    (esTipoImagenPermitido as any).mockReturnValue(true);
    (subirImagenCursoAStorage as any).mockRejectedValue(new Error("bucket no existe"));

    const resultado = await crearCurso(
      null,
      buildFormData({ ...datosValidos, imagenUrl: "" }, buildFile("portada.png", "image/png"))
    );

    expect(resultado.success).toBe(false);
    expect(prisma.courses.create).not.toHaveBeenCalled();
  });

  it("borra la imagen de Storage si falla la creación del curso en la base de datos", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1" } } }) },
    } as any);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: "u1", rol: "TUTOR" } as any);
    (esTipoImagenPermitido as any).mockReturnValue(true);
    (subirImagenCursoAStorage as any).mockResolvedValue({
      path: "abc-portada.png",
      url: "https://storage.test/imagenes-cursos/abc-portada.png",
    });
    vi.mocked(prisma.courses.create).mockRejectedValue(new Error("fallo db"));

    const resultado = await crearCurso(
      null,
      buildFormData({ ...datosValidos, imagenUrl: "" }, buildFile("portada.png", "image/png"))
    );

    expect(resultado.success).toBe(false);
    expect(eliminarImagenCursoDeStorage).toHaveBeenCalledWith("abc-portada.png");
  });
});