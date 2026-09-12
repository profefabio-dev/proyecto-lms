"use client";

import { useActionState, useState } from "react";
import { editarContenido } from "@/lib/actions/edit-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial = null;

/**
 * OP06: edición de un contenido ya publicado — título y descripción para
 * los tres tipos, más el cuerpo propio de cada uno (URL de YouTube, texto
 * Markdown, o reemplazar el archivo). Empieza cerrado (un simple botón
 * "Editar") para no duplicar el peso visual de cada contenido con un
 * formulario completo siempre a la vista; se abre solo al pedirlo.
 *
 * Los campos de texto son controlados (mismo patrón que
 * `create-course-form.tsx`, 08/09/2026): si el guardado falla por un dato
 * inválido, React 19 reinicia los campos no controlados de un
 * `<form action={...}>` en cada envío, así que sin esto el docente tendría
 * que volver a escribir todo tras un error. El campo de archivo es la única
 * excepción posible — ningún navegador permite reasignarle un archivo a un
 * `<input type="file">` por código, así que si hay un error hay que volver
 * a elegirlo (misma nota ya usada en OP04).
 */
export function EditContentForm({
  contentId,
  tipo,
  tituloActual,
  descripcionActual,
  contenidoActual,
  nombreArchivoActual,
}: {
  contentId: string;
  tipo: "VIDEO" | "TEXTO" | "DOCUMENTO";
  tituloActual: string;
  descripcionActual: string | null;
  contenidoActual: string;
  nombreArchivoActual?: string | null;
}) {
  const [estado, accion, enviando] = useActionState(editarContenido, estadoInicial);
  const [abierto, setAbierto] = useState(false);

  const valoresIniciales = {
    titulo: tituloActual,
    descripcion: descripcionActual ?? "",
    contenido: tipo === "DOCUMENTO" ? "" : contenidoActual,
  };
  const [valores, setValores] = useState(valoresIniciales);
  const [estadoYaLimpiado, setEstadoYaLimpiado] = useState(estado);

  if (estado !== estadoYaLimpiado) {
    setEstadoYaLimpiado(estado);
    if (estado?.success) {
      setAbierto(false);
    }
  }

  if (!abierto) {
    return (
      <Button type="button" variant="outline" size="xs" onClick={() => setAbierto(true)}>
        Editar
      </Button>
    );
  }

  return (
    <form action={accion} className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <input type="hidden" name="contentId" value={contentId} />

      <div className="space-y-1">
        <Label htmlFor={`titulo-editar-${contentId}`}>Título</Label>
        <Input
          id={`titulo-editar-${contentId}`}
          name="titulo"
          required
          value={valores.titulo}
          onChange={(e) => setValores((v) => ({ ...v, titulo: e.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor={`descripcion-editar-${contentId}`}>Descripción (opcional)</Label>
        <Input
          id={`descripcion-editar-${contentId}`}
          name="descripcion"
          value={valores.descripcion}
          onChange={(e) => setValores((v) => ({ ...v, descripcion: e.target.value }))}
        />
      </div>

      {tipo === "VIDEO" && (
        <div className="space-y-1">
          <Label htmlFor={`url-editar-${contentId}`}>URL de YouTube</Label>
          <Input
            id={`url-editar-${contentId}`}
            name="url"
            type="url"
            required
            value={valores.contenido}
            onChange={(e) => setValores((v) => ({ ...v, contenido: e.target.value }))}
          />
        </div>
      )}

      {tipo === "TEXTO" && (
        <div className="space-y-1">
          <Label htmlFor={`contenido-editar-${contentId}`}>Contenido</Label>
          <textarea
            id={`contenido-editar-${contentId}`}
            name="contenido"
            required
            rows={8}
            value={valores.contenido}
            onChange={(e) => setValores((v) => ({ ...v, contenido: e.target.value }))}
            className="w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
          />
          <p className="text-xs text-muted-foreground">
            Admite formato Markdown: # para títulos, **texto** para negrita y - para listas.
          </p>
        </div>
      )}

      {tipo === "DOCUMENTO" && (
        <div className="space-y-1">
          <Label htmlFor={`archivo-editar-${contentId}`}>
            Reemplazar archivo (opcional{nombreArchivoActual ? ` — actual: ${nombreArchivoActual}` : ""})
          </Label>
          <Input
            id={`archivo-editar-${contentId}`}
            name="archivo"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
          <p className="text-xs text-muted-foreground">
            Si no eliges un archivo nuevo, se conserva el actual y solo se actualizan el título y la
            descripción. Si hay un error al guardar, deberás volver a elegir el archivo (no título ni
            descripción).
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={enviando}>
          {enviando ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAbierto(false)}
          disabled={enviando}
        >
          Cancelar
        </Button>
      </div>

      {estado && !estado.success && (
        <p role="alert" className="text-xs text-red-600">
          {estado.error}
        </p>
      )}
    </form>
  );
}
