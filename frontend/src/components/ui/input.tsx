import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-lg border border-input bg-surface-muted px-3 py-1 text-sm",
        "text-foreground placeholder:text-muted-foreground",
        "transition-[border-color,box-shadow] duration-[160ms] ease-out-quint outline-none",
        "hover:border-border-strong",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "file:mr-3 file:h-7 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:text-[13px] file:font-medium file:text-secondary-foreground",
        className,
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-lg border border-input bg-surface-muted px-3 py-2 text-sm",
        "text-foreground placeholder:text-muted-foreground",
        "transition-[border-color,box-shadow] duration-[160ms] ease-out-quint outline-none",
        "hover:border-border-strong",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input, Textarea };
