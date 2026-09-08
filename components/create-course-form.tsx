"use client";

import { useActionState, useState } from "react";
import { crearCurso } from "@/lib/actions/create-course";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const estadoInicial = null;

const valoresIniciales = { titulo: "", descripcion: "", imagenUrl: "", estado: "BORRADOR" };

export function CreateCourseForm() {
  const [estado, accion, enviando] = useActionState(crearCurso, estadoInicial);

  // Los campos de texto son controlados a propósito: React vacía el
  // formulario en cada envío (incluso cuando el servidor lo rechaza por un
  // error de validación), así que sin este estado propio el docente tendría
  // que volver a escribir todo tras cada error, como reportó que le pasó.
  // El archivo de imagen no se puede conservar así (por seguridad, ningún
  // navegador permite reasignarle un archivo a un input mediante código),
  // así que ese sí hay que volver a seleccionarlo si hubo un error.
  const [valores, setValores] = useState(valoresIniciales);
  // Ajuste de estado durante el render (no en un efecto, siguiendo el
  // patrón recomendado por React para "reaccionar" a un cambio de prop):
  // en cuanto `estado` pasa a éxito, se limpia el formulario para el
  // siguiente curso.
  const [estadoYaLimpiado, setEstadoYaLimpiado] = useState(estado);
  if (estado !== estadoYaLimpiado) {
    setEstadoYaLimpiado(estado);
    if (estado?.success) {
      setValores(valoresIniciales);
    }
  }

  return (
    <form action={accion} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="titulo">Título</Label>
        <Input
          id="titulo"
          name="titulo"
          required
          value={valores.titulo}
          onChange={(evento) => setValores((actuales) => ({ ...actuales, titulo: evento.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <textarea
          id="descripcion"
          name="descripcion"
          required
          rows={4}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={valores.descripcion}
          onChange={(evento) =>
            setValores((actuales) => ({ ...actuales, descripcion: evento.target.value }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="imagenArchivo">Imagen del curso</Label>
        <Input id="imagenArchivo" name="imagenArchivo" type="file" accept="image/jpeg,image/png,image/webp" />
        <p className="text-xs text-muted-foreground">
          Sube una imagen desde tu computador (JPG, PNG o WEBP, máx. 5 MB) o, si prefieres,
          pega una URL abajo. Si hay un error al crear el curso, deberás volver a seleccionar el
          archivo (el navegador no permite conservarlo), pero el resto de los datos no se pierde.
        </p>
        <Label htmlFor="imagenUrl">URL de la imagen (opcional si ya subiste un archivo)</Label>
        <Input
          id="imagenUrl"
          name="imagenUrl"
          type="url"
          placeholder="https://..."
          value={valores.imagenUrl}
          onChange={(evento) =>
            setValores((actuales) => ({ ...actuales, imagenUrl: evento.target.value }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="estado">Estado</Label>
        <select
          id="estado"
          name="estado"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={valores.estado}
          onChange={(evento) => setValores((actuales) => ({ ...actuales, estado: evento.target.value }))}
        >
          <option value="BORRADOR">Borrador</option>
          <option value="PUBLICADO">Publicado</option>
        </select>
      </div>

      <Button type="submit" disabled={enviando}>
        {enviando ? "Creando..." : "Crear curso"}
      </Button>

      {estado && !estado.success && (
        <p role="alert" className="text-red-600 text-sm">
          {estado.error}
        </p>
      )}

      {estado && estado.success && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
          <p className="font-medium text-green-800">Curso creado correctamente.</p>
        </div>
      )}
    </form>
  );
}