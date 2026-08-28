"use client";

import { useActionState } from "react";
import { crearContenidoVideo } from "@/lib/actions/create-video-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial = null;

export function CreateVideoContentForm({ courseId }: { courseId: string }) {
  const [estado, accion, enviando] = useActionState(crearContenidoVideo, estadoInicial);

  return (
    <form action={accion} className="space-y-4 rounded-lg border p-4">
      <input type="hidden" name="courseId" value={courseId} />

      <div className="space-y-2">
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" name="titulo" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción (opcional)</Label>
        <Input id="descripcion" name="descripcion" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL de YouTube</Label>
        <Input
          id="url"
          name="url"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          required
        />
      </div>

      <Button type="submit" disabled={enviando}>
        {enviando ? "Publicando..." : "Publicar video"}
      </Button>

      {estado && !estado.success && (
        <p role="alert" className="text-sm text-red-600">
          {estado.error}
        </p>
      )}

      {estado && estado.success && (
        <p className="text-sm text-green-700">Video publicado correctamente.</p>
      )}
    </form>
  );
}
