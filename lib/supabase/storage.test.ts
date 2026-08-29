import { describe, it, expect, vi, beforeEach } from "vitest";

const uploadMock = vi.fn();
const removeMock = vi.fn();
const createSignedUrlMock = vi.fn();
const fromMock = vi.fn((_bucket: string) => ({
  upload: uploadMock,
  remove: removeMock,
  createSignedUrl: createSignedUrlMock,
}));

vi.mock("./admin", () => ({
  supabaseAdmin: {
    storage: {
      from: (bucket: string) => fromMock(bucket),
    },
  },
}));

import {
  esTipoDocumentoPermitido,
  esDocumentoPdf,
  subirDocumentoAStorage,
  eliminarDocumentoDeStorage,
  crearUrlDescarga,
  BUCKET_DOCUMENTOS,
} from "./storage";

function buildFile(name: string, type: string, content = "contenido") {
  return new File([content], name, { type });
}

describe("esTipoDocumentoPermitido", () => {
  it("acepta PDF y Word", () => {
    expect(esTipoDocumentoPermitido("application/pdf")).toBe(true);
    expect(esTipoDocumentoPermitido("application/msword")).toBe(true);
    expect(
      esTipoDocumentoPermitido(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe(true);
  });

  it("rechaza otros tipos (imagenes, ejecutables, etc.)", () => {
    expect(esTipoDocumentoPermitido("image/png")).toBe(false);
    expect(esTipoDocumentoPermitido("application/x-msdownload")).toBe(false);
  });
});

describe("esDocumentoPdf (US16)", () => {
  it("reconoce application/pdf como previsualizable", () => {
    expect(esDocumentoPdf("application/pdf")).toBe(true);
  });

  it("no marca los documentos Word como previsualizables", () => {
    expect(esDocumentoPdf("application/msword")).toBe(false);
    expect(
      esDocumentoPdf("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ).toBe(false);
  });

  it("no marca otros tipos de archivo como previsualizables", () => {
    expect(esDocumentoPdf("image/png")).toBe(false);
    expect(esDocumentoPdf("")).toBe(false);
  });
});

describe("subirDocumentoAStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sube el archivo al bucket de documentos y devuelve el path generado", async () => {
    uploadMock.mockResolvedValue({ data: { path: "irrelevante" }, error: null });

    const archivo = buildFile("Guia de clase.pdf", "application/pdf");
    const resultado = await subirDocumentoAStorage("curso-1", archivo);

    expect(fromMock).toHaveBeenCalledWith(BUCKET_DOCUMENTOS);
    expect(uploadMock).toHaveBeenCalledTimes(1);
    const [path, subido, opciones] = uploadMock.mock.calls[0];
    expect(path).toMatch(/^curso-1\/.+-Guia_de_clase\.pdf$/);
    expect(subido).toBe(archivo);
    expect(opciones).toEqual({ contentType: "application/pdf", upsert: false });
    expect(resultado.path).toBe(path);
  });

  it("lanza un error si Storage rechaza la subida", async () => {
    uploadMock.mockResolvedValue({ data: null, error: { message: "bucket no existe" } });

    const archivo = buildFile("doc.pdf", "application/pdf");

    await expect(subirDocumentoAStorage("curso-1", archivo)).rejects.toThrow(
      /No se pudo subir el archivo/
    );
  });
});

describe("eliminarDocumentoDeStorage", () => {
  it("llama a remove con el path indicado", async () => {
    removeMock.mockResolvedValue({ data: null, error: null });

    await eliminarDocumentoDeStorage("curso-1/algo.pdf");

    expect(fromMock).toHaveBeenCalledWith(BUCKET_DOCUMENTOS);
    expect(removeMock).toHaveBeenCalledWith(["curso-1/algo.pdf"]);
  });
});

describe("crearUrlDescarga", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve la URL firmada cuando Storage responde bien", async () => {
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: "https://ejemplo.test/firmada" },
      error: null,
    });

    const url = await crearUrlDescarga("curso-1/algo.pdf", 120);

    expect(createSignedUrlMock).toHaveBeenCalledWith("curso-1/algo.pdf", 120);
    expect(url).toBe("https://ejemplo.test/firmada");
  });

  it("devuelve null si Storage responde con error", async () => {
    createSignedUrlMock.mockResolvedValue({ data: null, error: { message: "no existe" } });

    const url = await crearUrlDescarga("curso-1/algo.pdf");

    expect(url).toBeNull();
  });
});
