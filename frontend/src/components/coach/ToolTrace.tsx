import { DatabaseIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * What the coach actually looked at before answering.
 *
 * The thinking indicator is a timer and says so; this is the honest record.
 * It matters beyond transparency: an athlete who can see that an answer came
 * from "read 14 activities" rather than from nothing has a way to tell a
 * grounded reply from a confident guess.
 */

const TOOL_LABELS: Record<string, string> = {
  list_activities: "Read your activities",
  get_activity_detail: "Opened a session in detail",
  get_training_summary: "Totalled your volume",
  get_hr_zone_distribution: "Checked heart-rate zones",
  get_athlete_profile: "Read your profile",
  get_personal_bests: "Looked up your bests",
  list_training_plans: "Listed your plans",
  get_training_plan: "Read a saved plan",
};

export interface ToolTraceProps {
  tools: string[];
  className?: string;
}

export function ToolTrace({ tools, className }: ToolTraceProps) {
  if (tools.length === 0) {
    return null;
  }

  // Repeated calls to the same tool are one line with a count - the coach
  // paging through activities should not read as eight separate lookups.
  const counts = new Map<string, number>();
  for (const tool of tools) {
    counts.set(tool, (counts.get(tool) ?? 0) + 1);
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 px-1", className)}>
      <DatabaseIcon className="size-3 text-muted-foreground" />
      {[...counts.entries()].map(([tool, count], index) => (
        <span
          key={tool}
          className="stagger-item rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
          style={{ "--stagger-index": index } as React.CSSProperties}
        >
          {TOOL_LABELS[tool] ?? tool}
          {count > 1 && <span className="tnum"> ×{count}</span>}
        </span>
      ))}
    </div>
  );
}
