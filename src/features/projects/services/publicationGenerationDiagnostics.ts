import {
  diagnosticMetrics, diagnosticReasons, incompleteReasons, responseStatuses, type GenerationAttempt,
} from "../types/publicationGenerationDiagnostics";

const failureCodes = [
  "provider_unavailable", "provider_refusal", "invalid_response", "invalid_project",
  "internal_error", "project_changed", "lease_expired",
];
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Optional diagnostics must never invalidate an otherwise usable job/receipt.
// Reconstruct only closed fields; never pass arbitrary provider strings to UI.
export function parseAttemptDiagnostics(value: unknown, attempts: number): GenerationAttempt[] {
  if (!Array.isArray(value) || value.length > 9 || !Number.isInteger(attempts) || attempts < 0 || attempts > 9) return [];
  const result: GenerationAttempt[] = [];
  const seen = new Set<number>();
  for (const entry of value) {
    if (!object(entry) || !object(entry.details) || typeof entry.attempt !== "number" ||
      !Number.isInteger(entry.attempt) || entry.attempt < 1 || entry.attempt > attempts ||
      seen.has(entry.attempt) || typeof entry.recordedAt !== "string" || entry.recordedAt.length > 64 ||
      !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/u.test(entry.recordedAt) ||
      !Number.isFinite(Date.parse(entry.recordedAt)) ||
      (entry.outcome !== "succeeded" && entry.outcome !== "failed")) return [];
    const data = entry.details;
    const reason = diagnosticReasons.find((reason) => reason === data.reason);
    const succeeded = entry.outcome === "succeeded";
    if (!reason || succeeded !== ["completed", "non_ai"].includes(reason) ||
      (succeeded ? entry.errorCode !== null : typeof entry.errorCode !== "string" ||
        !failureCodes.includes(entry.errorCode))) return [];
    const details: GenerationAttempt["details"] = { reason };
    const status = responseStatuses.find((status) => status === data.responseStatus);
    const incomplete = incompleteReasons.find((reason) => reason === data.incompleteReason);
    if (status) details.responseStatus = status;
    if (incomplete) details.incompleteReason = incomplete;
    if (typeof entry.details.normalizedLineBreaks === "boolean") {
      details.normalizedLineBreaks = entry.details.normalizedLineBreaks;
    }
    for (const key of diagnosticMetrics) {
      const number = entry.details[key];
      if (typeof number === "number" && Number.isSafeInteger(number) && number >= 0 && number <= 1_000_000_000 &&
        (key !== "httpStatus" || (number >= 100 && number <= 599))) details[key] = number;
    }
    seen.add(entry.attempt);
    result.push({
      attempt: entry.attempt, recordedAt: entry.recordedAt, outcome: succeeded ? "succeeded" : "failed",
      errorCode: succeeded ? null : entry.errorCode as string, details,
    });
  }
  return result.sort((a, b) => a.attempt - b.attempt);
}
