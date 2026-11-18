import { SocialError } from "./social-errors.ts";
import { type Environment } from "./social-store.ts";

const MAX_BODY_CHARS = 4096;

// Authorization: Bearer <user JWT>. Identity is resolved by the caller through Auth /user.
export function bearerAuthorization(request: Request): string {
  const authorization = request.headers.get("Authorization");
  if (!authorization || !/^Bearer \S+$/u.test(authorization) || authorization.length > 8192) {
    throw new SocialError("unauthorized");
  }
  return authorization;
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("Content-Length")) > MAX_BODY_CHARS) throw new SocialError("invalid_request");
  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) throw new SocialError("invalid_request");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { throw new SocialError("invalid_request"); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new SocialError("invalid_request");
  return body as Record<string, unknown>;
}

// Authorization codes are short printable ASCII strings without spaces.
export function parseAuthorizationCode(value: unknown): string {
  if (typeof value !== "string" || !/^[\x21-\x7e]{8,2048}$/u.test(value)) throw new SocialError("invalid_request");
  return value;
}

function allowedOrigins(env: Environment): Set<string> {
  const origins = new Set<string>();
  for (const entry of (env("SOCIAL_OAUTH_REDIRECT_ORIGINS") ?? "").split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    try { origins.add(new URL(trimmed).origin); } catch { /* ignore malformed entry */ }
  }
  return origins;
}

// The redirect URI must be byte-identical to the one used in the authorization request, so the
// original string is returned. Only allow-listed origins, no credentials, query or fragment.
export function parseRedirectUri(value: unknown, env: Environment): string {
  const origins = allowedOrigins(env);
  if (origins.size === 0) throw new SocialError("internal_error");
  if (typeof value !== "string" || value.length > 500) throw new SocialError("invalid_request");
  let url: URL;
  try { url = new URL(value); } catch { throw new SocialError("invalid_request"); }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) throw new SocialError("invalid_request");
  if (url.username || url.password || url.search || url.hash || !origins.has(url.origin)) {
    throw new SocialError("invalid_request");
  }
  return value;
}

export function parseAction<T extends string>(body: Record<string, unknown>, actions: readonly T[]): T {
  const action = body.action;
  if (typeof action !== "string" || !(actions as readonly string[]).includes(action)) {
    throw new SocialError("invalid_request");
  }
  return action as T;
}
