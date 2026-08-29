import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contentViews: {
      createMany: vi.fn(),
    },
  },
}));

import { registrarContenidosVistos } from "./progress-tracking";
import { prisma } from "@/lib/prisma";

describe("registrarContenidosVistos (US19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no consulta la base de datos si no hay contenidos", async () => {
    await registrarContenidosVistos("est-1", []);

    expect(prisma.contentViews.createMany).not.toHaveBeenCalled();
  });

  it("registra cada contenido visto, ignorando duplicados existentes", async () => {
    await registrarContenidosVistos("est-1", ["c1", "c2"]);

    expect(prisma.contentViews.createMany).toHaveBeenCalledWith({
      data: [
        { contentId: "c1", userId: "est-1" },
        { contentId: "c2", userId: "est-1" },
      ],
      skipDuplicates: true,
    });
  });
});
