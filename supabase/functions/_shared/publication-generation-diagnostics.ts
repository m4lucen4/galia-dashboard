// Closed, content-free metadata only. Never persist provider messages or source text.
export const diagnosticReasons = [
  "completed", "non_ai", "output_token_limit", "content_filter", "incomplete_response",
  "provider_failed", "provider_refusal", "invalid_json", "invalid_structure", "missing_output",
  "multiple_outputs", "empty_text", "text_too_long", "word_limit", "line_breaks",
  "markup_not_allowed", "hashtags_not_allowed", "provider_timeout", "network_error",
  "http_error", "invalid_project", "internal_error",
] as const;
export type DiagnosticReason = typeof diagnosticReasons[number];
export const responseStatuses = ["completed", "incomplete", "failed", "cancelled", "queued", "in_progress", "unknown"] as const;
export const incompleteReasons = ["max_output_tokens", "content_filter", "max_messages", "steered", "other"] as const;
export const diagnosticMetrics = [
  "inputTokens", "outputTokens", "reasoningTokens", "maxOutputTokens", "durationMs", "wordCount", "characterCount",
] as const;
export type ProviderDiagnostic = {
  reason: DiagnosticReason;
  responseStatus?: typeof responseStatuses[number];
  incompleteReason?: typeof incompleteReasons[number];
  httpStatus?: number;
  normalizedLineBreaks?: boolean;
} & Partial<Record<typeof diagnosticMetrics[number], number>>;

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

export function sanitizeDiagnostic(value: unknown): ProviderDiagnostic {
  const source = object(value);
  const result: ProviderDiagnostic = {
    reason: diagnosticReasons.find((reason) => reason === source.reason) ?? "internal_error",
  };
  const status = responseStatuses.find((status) => status === source.responseStatus);
  const incomplete = incompleteReasons.find((reason) => reason === source.incompleteReason);
  if (status) result.responseStatus = status;
  if (incomplete) result.incompleteReason = incomplete;
  for (const key of diagnosticMetrics) {
    const value = source[key];
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000) {
      result[key] = value;
    }
  }
  if (typeof source.httpStatus === "number" && Number.isInteger(source.httpStatus) &&
    source.httpStatus >= 100 && source.httpStatus <= 599) result.httpStatus = source.httpStatus;
  if (typeof source.normalizedLineBreaks === "boolean") result.normalizedLineBreaks = source.normalizedLineBreaks;
  return result;
}

export function responseDiagnostic(value: unknown): ProviderDiagnostic {
  const response = object(value);
  const usage = object(response.usage);
  const reason = object(response.incomplete_details).reason;
  return sanitizeDiagnostic({
    reason: "completed",
    responseStatus: responseStatuses.find((status) => status === response.status) ?? "unknown",
    ...(reason === undefined || reason === null ? {} : {
      incompleteReason: incompleteReasons.find((known) => known === reason) ?? "other",
    }),
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    reasoningTokens: object(usage.output_tokens_details).reasoning_tokens,
  });
}
