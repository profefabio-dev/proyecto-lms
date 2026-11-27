import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

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
    courseUsers: {
      findFirst: vi.fn(),
    },
    contentViews: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase/storage", () => ({
  crearUrlDescarga: vi.fn().mockResolvedValue(null),
}));

import CursoEstudiantePage from "./page";
import { redirect, notFound } from "next/navigation";
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

function buildParams(courseId: string) {
  return { params: Promise.resolve({ courseId }) };
}

describe("CursoEstudiantePage (US15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.contentViews.findMany as any).mockResolvedValue([]);
  });

  it("redirige a /login si no hay sesion activa", async () => {
    mockSesion(null);

    await expect(CursoEstudiantePage(buildParams("curso-1"))).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirige a /login a un Administrador", async () => {
    // US42 cambió esta guarda: ahora entran Estudiante y Tutor, y el Tutor
    // solo si es el dueño. Los demás roles siguen fuera.
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "adm-1", rol: "ADMINISTRADOR" });

    await expect(CursoEstudiantePage(buildParams("curso-1"))).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("US42: un Tutor que NO es dueño del curso recibe 404", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "otro-tutor", rol: "TUTOR" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      titulo: "Curso",
      descripcion: "desc",
      tutorId: "tutor-1",
      tutor: { nombre: "Ana", apellido: "Rios" },
      contenidos: [],
      secciones: [],
      anuncios: [],
      _count: { glosario: 0 },
      actividades: [],
      quizzes: [],
    });
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);

    await expect(CursoEstudiantePage(buildParams("curso-1"))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("US42: el Tutor dueño entra en vista previa, sin inscripción", async () => {
    mockSesion("auth-1");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "tutor-1", rol: "TUTOR" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      titulo: "Curso",
      descripcion: "desc",
      tutorId: "tutor-1",
      tutor: { nombre: "Ana", apellido: "Rios" },
      contenidos: [],
      secciones: [],
      anuncios: [],
      _count: { glosario: 0 },
      actividades: [],
      quizzes: [],
    });
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);

    // No lanza: ni redirect ni 404.
    await expect(CursoEstudiantePage(buildParams("curso-1"))).resolves.toBeTruthy();
  });

  it("devuelve 404 si el curso no existe", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courses.findUnique as any).mockResolvedValue(null);

    await expect(CursoEstudiantePage(buildParams("no-existe"))).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(notFound).toHaveBeenCalled();
  });

  it("devuelve 404 si el estudiante no esta inscrito en el curso", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      titulo: "Curso",
      descripcion: "desc",
      tutor: { nombre: "Ana", apellido: "Rios" },
      contenidos: [],
      secciones: [],
      anuncios: [],
      _count: { glosario: 0 },
      actividades: [],
      quizzes: [],
    });
    (prisma.courseUsers.findFirst as any).mockResolvedValue(null);

    await expect(CursoEstudiantePage(buildParams("curso-1"))).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(prisma.courseUsers.findFirst).toHaveBeenCalledWith({
      where: { courseId: "curso-1", userId: "est-1" },
    });
  });

  it("consulta los contenidos ordenados cuando el estudiante si esta inscrito", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      titulo: "Curso",
      descripcion: "desc",
      tutor: { nombre: "Ana", apellido: "Rios" },
      contenidos: [
        { id: "c1", titulo: "Video 1", descripcion: null, tipo: "VIDEO", contenido: "https://youtu.be/dQw4w9WgXcQ", visible: true, seccionId: null },
        { id: "c2", titulo: "Oculto", descripcion: null, tipo: "VIDEO", contenido: "https://youtu.be/dQw4w9WgXcQ", visible: false, seccionId: null },
      ],
      secciones: [],
      anuncios: [],
      _count: { glosario: 0 },
      actividades: [],
      quizzes: [],
    });
    (prisma.courseUsers.findFirst as any).mockResolvedValue({ id: "insc-1" });

    expect(prisma.courses.findUnique).not.toHaveBeenCalled();

    await CursoEstudiantePage(buildParams("curso-1"));

    expect(prisma.courses.findUnique).toHaveBeenCalledWith({
      where: { id: "curso-1" },
      include: {
        tutor: { select: { nombre: true, apellido: true } },
        contenidos: { orderBy: { orden: "asc" }, include: { documentos: true } },
        secciones: { orderBy: { orden: "asc" } },
        // US54 (27/11/2026): solo el conteo del glosario — la lista vive en
        // su propia pantalla.
        _count: { select: { glosario: true } },
        // US53 (25/11/2026): los anuncios del docente en la portada del curso.
        anuncios: {
          orderBy: { createdAt: "desc" },
          include: { tutor: { select: { nombre: true, apellido: true } } },
        },
        actividades: {
          where: { visible: true },
          orderBy: { orden: "asc" },
          include: { entregas: { where: { userId: "est-1" } } },
        },
        quizzes: {
          where: { visible: true },
          orderBy: { orden: "asc" },
          include: {
            _count: { select: { preguntas: true } },
            intentos: { where: { userId: "est-1" }, orderBy: { puntaje: "desc" }, take: 1 },
          },
        },
      },
    });
  });

  it("consulta cuales contenidos visibles ya fueron marcados como vistos (US19)", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      titulo: "Curso",
      descripcion: "desc",
      tutor: { nombre: "Ana", apellido: "Rios" },
      contenidos: [
        { id: "c1", titulo: "Video 1", descripcion: null, tipo: "VIDEO", contenido: "https://youtu.be/dQw4w9WgXcQ", visible: true, seccionId: null },
        { id: "c2", titulo: "Oculto", descripcion: null, tipo: "VIDEO", contenido: "https://youtu.be/dQw4w9WgXcQ", visible: false, seccionId: null },
      ],
      secciones: [],
      anuncios: [],
      _count: { glosario: 0 },
      actividades: [],
      quizzes: [],
    });
    (prisma.courseUsers.findFirst as any).mockResolvedValue({ id: "insc-1" });
    (prisma.contentViews.findMany as any).mockResolvedValue([{ contentId: "c1" }]);

    await CursoEstudiantePage(buildParams("curso-1"));

    expect(prisma.contentViews.findMany).toHaveBeenCalledWith({
      where: { userId: "est-1", contentId: { in: ["c1"] } },
      select: { contentId: true },
    });
  });

  it("no consulta contenidos vistos si el curso no tiene contenidos visibles", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      titulo: "Curso",
      descripcion: "desc",
      tutor: { nombre: "Ana", apellido: "Rios" },
      contenidos: [],
      secciones: [],
      anuncios: [],
      _count: { glosario: 0 },
      actividades: [],
      quizzes: [],
    });
    (prisma.courseUsers.findFirst as any).mockResolvedValue({ id: "insc-1" });

    await CursoEstudiantePage(buildParams("curso-1"));

    expect(prisma.contentViews.findMany).not.toHaveBeenCalled();
  });

  it("US30: el contenido de una sección No disponible no cuenta como visible ni se consulta como visto", async () => {
    mockSesion("auth-2");
    (prisma.users.findUnique as any).mockResolvedValue({ id: "est-1", rol: "ESTUDIANTE" });
    (prisma.courses.findUnique as any).mockResolvedValue({
      id: "curso-1",
      titulo: "Curso",
      descripcion: "desc",
      tutor: { nombre: "Ana", apellido: "Rios" },
      contenidos: [
        { id: "c1", titulo: "Video 1", descripcion: null, tipo: "VIDEO", contenido: "https://youtu.be/dQw4w9WgXcQ", visible: true, seccionId: "sec-1" },
        { id: "c2", titulo: "Video 2", descripcion: null, tipo: "VIDEO", contenido: "https://youtu.be/dQw4w9WgXcQ", visible: true, seccionId: "sec-2" },
      ],
      secciones: [
        { id: "sec-1", titulo: "Semana 1", orden: 0, estado: "DISPONIBLE", esActual: false },
        { id: "sec-2", titulo: "Semana 2", orden: 1, estado: "NO_DISPONIBLE", esActual: false },
      ],
      anuncios: [],
      _count: { glosario: 0 },
      actividades: [],
      quizzes: [],
    });
    (prisma.courseUsers.findFirst as any).mockResolvedValue({ id: "insc-1" });

    await CursoEstudiantePage(buildParams("curso-1"));

    expect(prisma.contentViews.findMany).toHaveBeenCalledWith({
      where: { userId: "est-1", contentId: { in: ["c1"] } },
      select: { contentId: true },
    });
  });
});
