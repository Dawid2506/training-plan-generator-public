import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-border-strong bg-surface-muted text-foreground",
        primary: "border-primary/25 bg-primary/12 text-primary",
        muted: "border-transparent bg-muted text-muted-foreground",
        success: "border-success/25 bg-success/12 text-success",
        warning: "border-warning/25 bg-warning/12 text-warning",
        info: "border-info/25 bg-info/12 text-info",
        destructive: "border-destructive/25 bg-destructive/12 text-destructive",
        run: "border-sport-run/25 bg-sport-run/12 text-sport-run",
        ride: "border-sport-ride/25 bg-sport-ride/12 text-sport-ride",
        other: "border-sport-other/25 bg-sport-other/12 text-sport-other",
        outline: "border-border-strong bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
