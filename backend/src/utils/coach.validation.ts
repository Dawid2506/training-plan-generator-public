import { z } from "zod";
import { COACH } from "../services/coach/config";

/**
 * Chat request validation.
 *
 * The old cap was 100 characters, which rejected any real coaching question -
 * and because the frontend had no maxLength, the athlete saw a silent "Not
 * delivered" rather than an explanation. The new cap is sized so a race report
 * or a week's plan can be pasted in (~1000 tokens) while the cost of a single
 * message stays bounded.
 *
 * Length is measured on the raw string, not the trimmed one, so 4000 spaces
 * followed by a payload cannot slip past. Content is normalised and defanged
 * separately, at the prompt boundary, by services/coach/sanitize.
 */
export const sendMessageSchema = z
  .object({
    content: z
      .string({ invalid_type_error: "Message must be text" })
      .max(
        COACH.maxUserMessageChars,
        `Message too long (max ${COACH.maxUserMessageChars} characters)`
      )
      .refine((value) => value.trim().length > 0, "Message is required"),
  })
  // Reject unknown keys: a body carrying userId must be a visible 400, not a
  // silently dropped field that leaves the caller thinking it was honoured.
  .strict();

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
