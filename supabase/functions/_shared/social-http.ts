import { SocialError, type SocialFailureCode } from "./social-errors.ts";

export type Fetcher = typeof fetch;

const MAX_RESPONSE_CHARS = 2_000_000;

// Every provider call goes through here: bounded time, and a redirect is a failure
// (a redirected request could carry the Authorization header to another host).
export async function socialFetch(
  fetcher: Fetcher, url: string, init: RequestInit = {}, timeoutMs = 10_000,
): Promise<Response> {
  try {
    return await fetcher(url, { ...init, redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new SocialError("provider_unavailable");
  }
}

// Reads a JSON object body; null when the body is empty, not JSON or not an object.
export async function readJsonObject(response: Response): Promise<Record<string, unknown> | null> {
  let text: string;
  try { text = await response.text(); } catch { return null; }
  if (text.length > MAX_RESPONSE_CHARS) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function transientStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

// Status of a provider API call made with a user's token.
export function apiFailureCode(status: number): SocialFailureCode {
  if (status === 401) return "token_invalid";
  if (status === 403) return "permission_missing";
  if (transientStatus(status)) return "provider_unavailable";
  return "provider_rejected";
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/u.test(value)) return Number(value);
  return null;
}

export function requiredEnv(env: (name: string) => string | undefined, key: string): string {
  const value = env(key);
  if (!value?.trim()) throw new SocialError("internal_error");
  return value;
}

export function secondsFromNow(now: number, seconds: number | null): Date | null {
  return seconds === null ? null : new Date(now + seconds * 1000);
}
