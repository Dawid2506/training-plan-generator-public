import { useEffect, useState } from "react";
import { SparklesIcon } from "lucide-react";

/**
 * The wait indicator while the coach works.
 *
 * Be clear about what this is: the labels advance on a timer, not on events.
 * There is no streaming, so the server tells us nothing until the whole answer
 * is ready, and a single motionless spinner for fifteen seconds reads as a hang.
 * The honest record of what the coach actually did is ToolTrace, which appears
 * underneath the answer afterwards.
 */

const STAGES = [
  { afterMs: 0, label: "Thinking…" },
  { afterMs: 1_200, label: "Reading your training data…" },
  { afterMs: 6_000, label: "Working through the numbers…" },
  { afterMs: 15_000, label: "Still going - this one needs a few lookups…" },
] as const;

export function ThinkingIndicator() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = STAGES.map((entry, index) =>
      entry.afterMs === 0
        ? undefined
        : window.setTimeout(() => setStage(index), entry.afterMs),
    );

    return () => {
      for (const timer of timers) {
        if (timer !== undefined) {
          window.clearTimeout(timer);
        }
      }
    };
  }, []);

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted text-primary">
        <SparklesIcon className="size-3.5" />
      </span>
      <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3.5">
        <span className="flex items-center gap-1.5">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
              style={{ animationDelay: `${index * 120}ms` }}
            />
          ))}
        </span>
        {/* Keyed on the stage so the label crossfades rather than snapping. */}
        <span key={stage} className="soft-enter text-[12.5px] text-muted-foreground">
          {STAGES[stage].label}
        </span>
      </div>
    </div>
  );
}
