import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap border border-transparent font-medium outline-none transition-all duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-primary text-primary-foreground shadow-[0_20px_45px_-24px_rgba(255,0,0,0.78),inset_0_1px_0_rgba(255,249,244,0.18)] hover:bg-[color:var(--travel-accent-strong)]",
        outline:
          "rounded-full border-border bg-white/[0.03] text-foreground hover:bg-white/[0.06]",
        secondary:
          "rounded-full border-border bg-secondary/80 text-secondary-foreground hover:bg-secondary",
        ghost: "rounded-full text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
        destructive: "rounded-full bg-destructive text-destructive-foreground hover:brightness-110",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-1.5 px-5 text-sm",
        xs: "h-7 gap-1 px-2.5 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1 px-3.5 text-[12px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-6 text-sm",
        icon: "size-8",
        "icon-xs": "size-7 rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9 rounded-full",
        "icon-lg": "size-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
