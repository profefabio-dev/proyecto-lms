import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: AvatarPrimitive.Root.Props) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-9 shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("size-full object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full text-xs font-semibold uppercase",
        className
      )}
      {...props}
    />
  )
}

/** Genera las iniciales (máx. 2 letras) a partir de nombre y apellido. */
function iniciales(nombre?: string | null, apellido?: string | null) {
  const n = nombre?.trim()?.[0] ?? ""
  const a = apellido?.trim()?.[0] ?? ""
  return (n + a).toUpperCase() || "?"
}

export { Avatar, AvatarImage, AvatarFallback, iniciales }
