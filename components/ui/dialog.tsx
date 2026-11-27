"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

// Envoltorio propio sobre el diálogo de Base UI, con el estilo de la
// plataforma. Se creó para el rediseño de los formularios de creación
// (cursos primero; tutores y estudiantes después): hasta ahora el
// formulario vivía siempre abierto encima del listado y lo empujaba hacia
// abajo, así que la pantalla abría mostrando un formulario en vez del
// contenido que el tutor viene a consultar.
//
// En celular el diálogo ocupa toda la pantalla en vez de ser una ventana
// centrada: una ventana flotante con un formulario largo se desborda en
// pantallas angostas, que es justo el problema corregido en el commit
// 5b161b4.

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogContent({
  className,
  children,
  titulo,
  descripcion,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup> & {
  titulo: string;
  descripcion?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-backdrop"
        className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-[2px] transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none"
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed z-50 flex flex-col bg-card text-card-foreground shadow-lg ring-1 ring-foreground/10 outline-none",
          // Celular: hoja a pantalla completa.
          "inset-0 w-full",
          // Escritorio: ventana centrada, con alto máximo para que el
          // formulario haga scroll por dentro y nunca estire la página.
          "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[85dvh] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
          // `scale` y `translate` son propiedades aparte en Tailwind v4, así
          // que la transición nombra `scale` y no `transform`.
          "transition-[opacity,scale] duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 sm:data-[starting-style]:scale-95 sm:data-[ending-style]:scale-95 motion-reduce:transition-none",
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4 sm:px-6">
          <div className="space-y-1">
            <DialogPrimitive.Title className="font-heading text-lg font-bold text-foreground">
              {titulo}
            </DialogPrimitive.Title>
            {descripcion && (
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                {descripcion}
              </DialogPrimitive.Description>
            )}
          </div>

          <DialogPrimitive.Close
            aria-label="Cerrar"
            className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

export { Dialog, DialogTrigger, DialogClose, DialogContent };
