// Keep aligned with the server's closed, content-free diagnostic contract.
export const diagnosticReasons = [
  "completed", "non_ai", "output_token_limit", "content_filter", "incomplete_response",
  "provider_failed", "provider_refusal", "invalid_json", "invalid_structure", "missing_output",
  "multiple_outputs", "empty_text", "text_too_long", "word_limit", "line_breaks",
  "markup_not_allowed", "hashtags_not_allowed", "provider_timeout", "network_error",
  "http_error", "invalid_project", "internal_error",
] as const;
export const responseStatuses = ["completed", "incomplete", "failed", "cancelled", "queued", "in_progress", "unknown"] as const;
export const incompleteReasons = ["max_output_tokens", "content_filter", "max_messages", "steered", "other"] as const;
export const diagnosticMetrics = [
  "maxOutputTokens", "inputTokens", "outputTokens", "reasoningTokens",
  "durationMs", "wordCount", "characterCount", "httpStatus",
] as const;
export type GenerationAttempt = {
  attempt: number;
  recordedAt: string;
  outcome: "succeeded" | "failed";
  errorCode: string | null;
  details: {
    reason: typeof diagnosticReasons[number];
    responseStatus?: typeof responseStatuses[number];
    incompleteReason?: typeof incompleteReasons[number];
    normalizedLineBreaks?: boolean;
  } & Partial<Record<typeof diagnosticMetrics[number], number>>;
};
