import * as React from "react"
import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const progressTrackVariants = cva("w-full overflow-hidden rounded-full bg-muted", {
  variants: {
    size: {
      default: "h-2",
      // Duolingo usa una barra de ~16px de alto — se ve mucho más "de
      // videojuego" que la delgada de 8px, que es lo que hacía sentir el
      // panel del Estudiante como un panel de administración cualquiera
      // (pase de diseño de 2026-09-04).
      lg: "h-4",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

const progressIndicatorVariants = cva(
  "h-full rounded-full transition-all duration-500 ease-out",
  {
    variants: {
      variant: {
        default: "bg-duo-blue",
        success: "bg-duo-green",
        warning: "bg-amber-500 dark:bg-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface ProgressProps
  extends Omit<ProgressPrimitive.Root.Props, "children">,
    VariantProps<typeof progressIndicatorVariants>,
    VariantProps<typeof progressTrackVariants> {
  /** Muestra el porcentaje numérico junto a la barra. */
  showValue?: boolean
}

function Progress({
  className,
  variant,
  size,
  value,
  showValue = false,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn("flex w-full flex-col gap-1", className)}
      {...props}
    >
      {showValue && (
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <ProgressPrimitive.Label>Progreso</ProgressPrimitive.Label>
          <ProgressPrimitive.Value />
        </div>
      )}
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className={cn(progressTrackVariants({ size }))}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn(progressIndicatorVariants({ variant }))}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress, progressIndicatorVariants, progressTrackVariants }
