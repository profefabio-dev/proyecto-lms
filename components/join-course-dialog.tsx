"use client";

import { useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus, ArrowRight, CheckCircle2, X } from "lucide-react";
import { unirseACursoConCodigo, type ResultadoUnirseCurso } from "@/lib/actions/join-course-by-code";
import { esFormaDeCodigo } from "@/lib/course-code";
import { Button } from "@/components/ui/button";

export function JoinCourseDialog() {
  const [abierto, setAbierto] = useState(false);
  const [codigoInput, setCodigoInput] = useState("");
  const [estado, formAction, enviando] = useActionState(unirseACursoConCodigo, null);
  const router = useRouter();

  useEffect(() => {
    if (estado?.success) {
      const timer = setTimeout(() => {
        router.push(`/estudiante/cursos/${estado.courseId}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [estado, router]);

  const formatoCodigo = (val: string) => {
    const raw = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (raw.length > 4) {
      return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    }
    return raw;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAbierto(true);
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/20 hover:border-primary transition-all shadow-xs"
      >
        <Plus className="size-3.5" />
        <span>Unirme con código</span>
      </button>

      {/* Modal Backdrop y Contenedor */}
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Botón cerrar */}
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="absolute right-4 top-4 p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="size-4" />
            </button>

            {estado?.success ? (
              <div className="py-6 text-center space-y-3">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2 className="size-7" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  {estado.yaInscrito ? "¡Ya estabas inscrito!" : "¡Inscripción exitosa!"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Accediendo a <span className="font-semibold text-foreground">{estado.titulo}</span>...
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <KeyRound className="size-4" />
                    <span>Código de Clase</span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground">
                    Unirme a un Curso
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pídele a tu profesor el código de 8 caracteres de tu asignatura (ej:{" "}
                    <code className="text-primary font-mono font-bold">C8E1-4B2D</code>) para acceder a los contenidos.
                  </p>
                </div>

                <form action={formAction} className="space-y-4">
                  <div className="space-y-1">
                    <input
                      type="text"
                      name="codigo"
                      value={codigoInput}
                      onChange={(e) => setCodigoInput(formatoCodigo(e.target.value))}
                      placeholder="XXXX-XXXX"
                      maxLength={9}
                      autoFocus
                      required
                      className="w-full h-12 rounded-xl border border-border/80 bg-background px-4 text-center font-mono text-lg font-bold tracking-widest text-foreground uppercase placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    />
                  </div>

                  {estado && !estado.success && (
                    <p className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 text-center">
                      {estado.error}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAbierto(false)}
                      className="rounded-xl"
                    >
                      Cancelar
                    </Button>
                    {/* 26/11/2026: el servidor exige el código completo, así que el
                        botón se habilita con el código completo y no con cuatro
                        caracteres — antes se podía enviar algo que iba a fallar. */}
                    <Button
                      type="submit"
                      size="sm"
                      disabled={enviando || !esFormaDeCodigo(codigoInput)}
                      className="rounded-xl font-bold gap-1.5"
                    >
                      {enviando ? "Verificando..." : "Inscribirme"}
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
