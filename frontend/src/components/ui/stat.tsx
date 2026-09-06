import { cn } from "@/lib/utils";

interface StatProps extends React.ComponentProps<"div"> {
  label: string;
  value: React.ReactNode;
  unit?: string;
  /** Larger treatment for hero metrics. */
  emphasis?: "default" | "large";
}

/**
 * The number is the thing, so it leads: big, tabular, tight. The label sits
 * underneath in caption case and never competes with it.
 */
function Stat({
  label,
  value,
  unit,
  emphasis = "default",
  className,
  ...props
}: StatProps) {
  return (
    <div data-slot="stat" className={cn("min-w-0", className)} {...props}>
      <div
        className={cn(
          "tnum flex items-baseline gap-1 font-semibold tracking-[-0.02em] text-foreground",
          emphasis === "large" ? "text-[26px] leading-none" : "text-[19px] leading-none",
        )}
      >
        <span className="truncate">{value}</span>
        {unit && (
          <span className="text-[12px] font-medium tracking-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      <div className="mt-1.5 truncate text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </div>
    </div>
  );
}

export { Stat };
