import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap",
    "rounded-lg text-sm font-medium select-none",
    // Only transform and opacity animate - both skip layout and paint.
    "transition-[transform,background-color,border-color,color,opacity] duration-[120ms] ease-out-quint",
    // Instant press feedback: the interface heard you.
    "active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-50",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[0_1px_0_0_oklch(1_0_0/0.18)_inset] hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-accent",
        outline:
          "border border-border-strong bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/50",
        link: "bg-transparent text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-[13px] has-[>svg]:px-2.5",
        default: "h-9 px-4 has-[>svg]:px-3.5",
        lg: "h-11 rounded-xl px-6 text-[15px]",
        icon: "size-9",
        "icon-sm": "size-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
