import { Toaster as SonnerToaster } from "sonner";

import { useTheme } from "@/contexts/ThemeContext";

/**
 * Sonner styled with our own tokens so toasts belong to the app in both themes.
 * Mounted once, near the root - `notify()` can then be called from anywhere.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="bottom-right"
      offset={20}
      gap={10}
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-popover !text-popover-foreground !shadow-xl !shadow-black/20 !font-sans !text-[13px]",
          title: "!font-medium",
          description: "!text-muted-foreground !text-[12.5px]",
          actionButton: "!bg-primary !text-primary-foreground !rounded-md",
          cancelButton: "!bg-secondary !text-secondary-foreground !rounded-md",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-destructive",
          warning: "[&_[data-icon]]:!text-warning",
          info: "[&_[data-icon]]:!text-info",
        },
      }}
    />
  );
}
