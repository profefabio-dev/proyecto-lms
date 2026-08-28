"use client";

import { useActionState } from "react";
import { crearContenidoTexto } from "@/lib/actions/create-text-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial = null;

export function CreateTextContentForm({ courseId }: { courseId: string }) {
  const [estado, accion, enviando] = useActionState(crearContenidoTexto, estadoInicial);

  return (
    <form action={accion} className="space-y-4 rounded-lg border p-4">
      <input type="hidden" name="courseId" value={courseId} />

      <div className="space-y-2">
        <Label htmlFor="titulo-texto">Título</Label>
        <Input id="titulo-texto" name="titulo" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion-texto">Descripción (opcional)</Label>
        <Input id="descripcion-texto" name="descripcion" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contenido">Contenido</Label>
        <textarea
          id="contenido"
          name="contenido"
          required
          rows={8}
          placeholder={"# Título\n\nTexto con **negrita** y listas:\n\n- Punto uno\n- Punto dos"}
          className="w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
        />
        <p className="text-xs text-gray-500">
          Admite formato Markdown: # para títulos, **texto** para negrita y - para listas.
        </p>
      </div>

      <Button type="submit" disabled={enviando}>
        {enviando ? "Publicando..." : "Publicar contenido"}
      </Button>

      {estado && !estado.success && (
        <p role="alert" className="text-sm text-red-600">
          {estado.error}
        </p>
      )}

      {estado && estado.success && (
        <p className="text-sm text-green-700">Contenido publicado correctamente.</p>
      )}
    </form>
  );
}
