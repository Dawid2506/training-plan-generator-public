/**
 * Detection and structured logging for prompt-injection attempts.
 *
 * Nothing here blocks a request. False positives are guaranteed - "ignore the
 * previous week's data" is a perfectly ordinary coaching question - and
 * blocking on a keyword is an arms race that the blocker loses. The real
 * defences are structural (read-only tools, userId from the JWT, zod-validated
 * arguments); these signals exist so that when something does get through you
 * can find out, and find the row that carried it.
 *
 * Events are emitted as single-line JSON so they stay greppable in a hosted log
 * viewer. What is deliberately never logged: the API key, the system prompt,
 * full tool results, or the athlete's complete message - all of it is either a
 * secret or personal data that would then live in the logs forever.
 */

export type AuditSource =
  | "activity_name"
  | "file_name"
  | "profile_goal"
  | "plan_text"
  | "user_message"
  | "history"
  | "model_output";

const PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/ignore\s+(all\s+)?(the\s+)?(previous|prior|above|earlier)/i, "ignore_previous"],
  [/disregard\s+(the\s+)?(above|previous|prior|your)/i, "disregard"],
  [/(system|developer)\s+(prompt|message|instructions?)/i, "system_prompt_ref"],
  [/you\s+are\s+now\b|from\s+now\s+on\s+you/i, "role_reassign"],
  [/new\s+(instructions?|rules?|system)/i, "new_instructions"],
  [
    /(reveal|repeat|print|output|show)\s+(me\s+)?(your|the)\s+(prompt|instructions|rules)/i,
    "prompt_exfil",
  ],
  [/\bDAN\b|jailbreak|developer\s+mode|maintenance\s+mode/i, "jailbreak_slang"],
  [/!\[[^\]]*\]\(/, "markdown_image"],
  [/<\s*(script|img|iframe|svg|object|embed)\b/i, "html_tag"],
  [/\b(https?|data|javascript|vbscript):/i, "url_or_scheme"],
  [/<\|[^|>]{1,40}\|>|^\s*assistant\s*:|<\/?(system|user|assistant)>/im, "chat_structure"],
  [/other\s+users?|another\s+(user|athlete|account)|all\s+users/i, "cross_tenant"],
];

/**
 * Name the suspicious shapes in a string. Runs after NFKC normalisation so that
 * fullwidth and compatibility lookalikes have already been folded down - order
 * matters here, a detector that runs first sees a different string than the
 * model will.
 */
export const detectInjectionSignals = (text: string): string[] => {
  const signals: string[] = [];

  for (const [pattern, name] of PATTERNS) {
    if (pattern.test(text)) {
      signals.push(name);
    }
  }

  return signals;
};

/** A short, already-sanitised excerpt - enough to recognise, not enough to leak. */
const safeSample = (text: string, length = 120): string =>
  text.length > length ? `${text.slice(0, length)}…` : text;

const emit = (level: "info" | "warn", event: Record<string, unknown>): void => {
  const line = JSON.stringify(event);
  if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
};

export interface InjectionSignalEvent {
  userId: string;
  sessionId?: string;
  messageId?: string;
  source: AuditSource;
  activityId?: string;
  signals: string[];
  text: string;
}

export const injectionSignal = (event: InjectionSignalEvent): void => {
  if (event.signals.length === 0) {
    return;
  }

  emit("warn", {
    evt: "coach.injection_signal",
    userId: event.userId,
    sessionId: event.sessionId,
    messageId: event.messageId,
    source: event.source,
    activityId: event.activityId,
    signals: event.signals,
    sample: safeSample(event.text),
  });
};

export interface ToolCallEvent {
  userId: string;
  sessionId?: string;
  messageId?: string;
  tool: string;
  ok: boolean;
  durationMs: number;
  resultBytes: number;
  error?: string;
}

/** Arguments are deliberately absent - they can echo untrusted data back into logs. */
export const toolCall = (event: ToolCallEvent): void => {
  emit("info", { evt: "coach.tool_call", ...event });
};

export interface TurnCompleteEvent {
  userId: string;
  sessionId?: string;
  messageId?: string;
  iterations: number;
  toolCalls: number;
  totalTokens: number;
  toolsUsed: string[];
  stoppedBy: "answered" | "iterations" | "budget" | "deadline" | "tool_cap";
  mediaStripped: number;
}

export const turnComplete = (event: TurnCompleteEvent): void => {
  // Media stripped from an answer means an injection got far enough to change
  // what the coach tried to emit. That is the event worth alerting on.
  emit(event.mediaStripped > 0 ? "warn" : "info", {
    evt: "coach.turn_complete",
    ...event,
  });
};
