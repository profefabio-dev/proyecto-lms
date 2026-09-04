import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success:
          "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
        warning:
          "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        // Insignia de logro (curso 100% completado), pase de diseño de
        // 2026-09-04: dorado con relieve en vez del "success" plano, con un
        // pequeño rebote al aparecer — se ve como algo que se "ganó", no
        // solo un estado más de la lista.
        achievement:
          "animate-pop-in border-transparent bg-duo-gold px-3 py-1 font-bold text-white shadow-[0_2px_0_var(--duo-gold-shadow)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
