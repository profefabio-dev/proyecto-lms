import { describe, it, expect } from "vitest";
import { extraerYoutubeId, esUrlDeYoutubeValida, construirEmbedUrl } from "./youtube";

describe("extraerYoutubeId (US08)", () => {
  it("extrae el id de una URL watch?v=", () => {
    expect(extraerYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("extrae el id de una URL youtu.be", () => {
    expect(extraerYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extrae el id de una URL /embed/", () => {
    expect(extraerYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("extrae el id de una URL /shorts/", () => {
    expect(extraerYoutubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("ignora parametros extra como ?v=ID&t=30s", () => {
    expect(
      extraerYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s")
    ).toBe("dQw4w9WgXcQ");
  });

  it("funciona con www. y m. y sin www", () => {
    expect(extraerYoutubeId("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(extraerYoutubeId("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("devuelve null para una URL que no es de YouTube", () => {
    expect(extraerYoutubeId("https://vimeo.com/12345")).toBeNull();
  });

  it("devuelve null para una URL de YouTube sin id (home, canal, etc.)", () => {
    expect(extraerYoutubeId("https://www.youtube.com/")).toBeNull();
    expect(extraerYoutubeId("https://www.youtube.com/@algunCanal")).toBeNull();
  });

  it("devuelve null para texto que no es una URL", () => {
    expect(extraerYoutubeId("no-es-una-url")).toBeNull();
  });
});

describe("esUrlDeYoutubeValida", () => {
  it("true para un enlace valido", () => {
    expect(esUrlDeYoutubeValida("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  });

  it("false para un enlace invalido", () => {
    expect(esUrlDeYoutubeValida("https://vimeo.com/12345")).toBe(false);
  });
});

describe("construirEmbedUrl", () => {
  it("arma la URL de embed a partir de un enlace watch", () => {
    expect(construirEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ"
    );
  });

  it("devuelve null si la URL no es de YouTube", () => {
    expect(construirEmbedUrl("https://vimeo.com/12345")).toBeNull();
  });
});
