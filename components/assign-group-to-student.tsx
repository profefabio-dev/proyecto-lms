"use client";

import { useTransition } from "react";
import { asignarGrupoEstudiante } from "@/lib/actions/groups";

export function AssignGroupToStudent({
  userId,
  grupoIdActual,
  grupos,
}: {
  userId: string;
  grupoIdActual: string | null;
  grupos: { id: string; nombre: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  const handleCambio = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoGrupoId = e.target.value;
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("grupoId", nuevoGrupoId);
    startTransition(async () => {
      await asignarGrupoEstudiante(null, fd);
    });
  };

  return (
    <select
      value={grupoIdActual ?? ""}
      onChange={handleCambio}
      disabled={isPending}
      className="rounded-2xl border border-border/80 bg-background px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-opacity"
      title="Asignar salón o grupo escolar"
    >
      <option value="">Sin grupo</option>
      {grupos.map((g) => (
        <option key={g.id} value={g.id}>
          {g.nombre}
        </option>
      ))}
    </select>
  );
}
