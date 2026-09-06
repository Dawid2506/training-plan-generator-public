import { MoonIcon, SunIcon } from "lucide-react";

import { useTheme } from "@/contexts/ThemeContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The page colours swap instantly - transitioning every surface at once is a
 * full-page repaint and always looks worse than the cut. Only the icon animates.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          className={cn(
            "relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg",
            "text-muted-foreground transition-[background-color,color,transform] duration-[120ms] ease-out-quint",
            "hover:bg-accent hover:text-foreground active:scale-[0.94]",
            "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
            className,
          )}
        >
          <SunIcon
            className={cn(
              "absolute size-4 transition-[transform,opacity] duration-[220ms] ease-out-quint",
              isDark ? "scale-75 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
            )}
          />
          <MoonIcon
            className={cn(
              "absolute size-4 transition-[transform,opacity] duration-[220ms] ease-out-quint",
              isDark ? "scale-100 rotate-0 opacity-100" : "scale-75 rotate-90 opacity-0",
            )}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isDark ? "Light theme" : "Dark theme"}
      </TooltipContent>
    </Tooltip>
  );
}
