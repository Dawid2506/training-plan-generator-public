/**
 * Every knob the coach turns, in one place.
 *
 * These are caps, not preferences. A single chat message now fans out into
 * several model calls and a dozen database reads, so each limit below is what
 * stops one question from becoming an unbounded bill. Keep them env-overridable
 * so a runaway can be reined in without a redeploy.
 */

const int = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const COACH = {
  /** Single source of truth for the model id - also what lands in TokenUsage.model. */
  model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",

  // --- Per-request ceilings -------------------------------------------------
  /** Model round-trips per user message. The last one runs without tools. */
  maxIterations: int(process.env.COACH_MAX_ITERATIONS, 5),
  /** Total tool executions per user message, across all iterations. */
  maxToolCalls: int(process.env.COACH_MAX_TOOL_CALLS, 12),
  /** Wall-clock budget for the whole turn. */
  deadlineMs: int(process.env.COACH_DEADLINE_MS, 60_000),
  /** Timeout for one OpenAI call. */
  callTimeoutMs: int(process.env.COACH_CALL_TIMEOUT_MS, 30_000),
  /** Cumulative token budget for a turn; once spent, the model must answer. */
  tokenBudget: int(process.env.COACH_TOKEN_BUDGET, 60_000),

  // --- Context sizing -------------------------------------------------------
  /** Prior messages replayed into context (roughly six exchanges). */
  maxHistoryMessages: int(process.env.COACH_MAX_HISTORY, 12),
  maxHistoryChars: 12_000,
  /** One tool result, serialised. Bigger results are replaced with a hint. */
  maxToolResultChars: 12_000,
  /** All tool results in a turn combined. */
  maxTotalToolResultChars: 40_000,
  maxAnswerTokens: 900,

  // --- Input / output limits ------------------------------------------------
  maxUserMessageChars: int(process.env.COACH_MAX_MESSAGE_CHARS, 4_000),
  maxAnswerChars: 8_000,

  // --- Abuse controls -------------------------------------------------------
  /** Messages per user per window. */
  burstLimit: int(process.env.COACH_BURST_LIMIT, 10),
  burstWindowMs: int(process.env.COACH_BURST_WINDOW_MS, 5 * 60_000),
  /** Rolling 24h token ceiling per user, enforced against TokenUsage. */
  dailyTokenCeiling: int(process.env.COACH_DAILY_TOKEN_CEILING, 500_000),

  temperature: 0.4,
} as const;

/**
 * The model id, resolved once. Callers must use this rather than a literal so
 * the request and its TokenUsage row can never disagree about what ran.
 */
export const getChatModel = (): string => COACH.model;
