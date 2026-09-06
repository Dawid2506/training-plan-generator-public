import { AlertCircleIcon, CheckIcon, LoaderIcon, SparklesIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ChatMessageProps {
  message: string;
  isAnswer: boolean;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
}

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function ChatMessage({
  message,
  isAnswer,
  timestamp,
  status,
}: ChatMessageProps) {
  return (
    <div className={cn("flex gap-3", isAnswer ? "justify-start" : "justify-end")}>
      {isAnswer && (
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted text-primary">
          <SparklesIcon className="size-3.5" />
        </span>
      )}

      <div className={cn("max-w-[min(42rem,80%)] space-y-1.5", !isAnswer && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap",
            isAnswer
              ? "rounded-tl-md border border-border bg-card text-card-foreground"
              : "rounded-tr-md bg-primary text-primary-foreground",
            status === "error" && "border-destructive/40 bg-destructive/10 text-foreground",
          )}
        >
          {message}
        </div>

        <div
          className={cn(
            "tnum flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground",
            isAnswer ? "justify-start" : "justify-end",
          )}
        >
          <span>{formatTime(timestamp)}</span>
          {!isAnswer && status === "sending" && (
            <LoaderIcon className="size-3 animate-spin" />
          )}
          {!isAnswer && status === "sent" && <CheckIcon className="size-3" />}
          {!isAnswer && status === "error" && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircleIcon className="size-3" /> Not delivered
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
