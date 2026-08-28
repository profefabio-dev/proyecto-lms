"use client";

import { useActionState } from "react";
import { subirDocumento } from "@/lib/actions/create-document-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial = null;

export function UploadDocumentForm({ courseId }: { courseId: string }) {
  const [estado, accion, enviando] = useActionState(subirDocumento, estadoInicial);

  return (
    <form action={accion} className="space-y-4 rounded-lg border p-4">
      <input type="hidden" name="courseId" value={courseId} />

      <div className="space-y-2">
        <Label htmlFor="titulo-doc">Título</Label>
        <Input id="titulo-doc" name="titulo" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion-doc">Descripción (opcional)</Label>
        <Input id="descripcion-doc" name="descripcion" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="archivo">Archivo (PDF o Word, máx. 10 MB)</Label>
        <Input
          id="archivo"
          name="archivo"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
        />
      </div>

      <Button type="submit" disabled={enviando}>
        {enviando ? "Subiendo..." : "Subir documento"}
      </Button>

      {estado && !estado.success && (
        <p role="alert" className="text-sm text-red-600">
          {estado.error}
        </p>
      )}

      {estado && estado.success && (
        <p className="text-sm text-green-700">Documento publicado correctamente.</p>
      )}
    </form>
  );
}
