// LinkedIn provider calls shared by social-connect-linkedin and social-credentials-check.
import { SocialError } from "./social-errors.ts";
import {
  apiFailureCode, asNumber, asRecord, asString, type Fetcher, readJsonObject, requiredEnv, secondsFromNow,
  socialFetch, transientStatus,
} from "./social-http.ts";
import type { Environment } from "./social-store.ts";
import { LINKEDIN_LEGACY_SCOPES, type LinkedInMirrorPage } from "./social-n8n-mirror.ts";

export const LINKEDIN_VERSION = "202611";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const DEFAULT_REFRESH_TTL_SECONDS = 365 * 24 * 3600;
const MAX_ORGANIZATIONS = 200;

export interface LinkedInTokens {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  accessExpiresAt: Date;
  // null when LinkedIn gave no refresh token (or, on refresh, did not report its lifetime).
  refreshExpiresAt: Date | null;
  scopes: string[];
}

async function tokenRequest(
  env: Environment, fetcher: Fetcher, params: Record<string, string>, now: number, kind: "exchange" | "refresh",
): Promise<LinkedInTokens> {
  const body = new URLSearchParams({
    ...params,
    client_id: requiredEnv(env, "LINKEDIN_CLIENT_ID"),
    client_secret: requiredEnv(env, "LINKEDIN_CLIENT_SECRET"),
  });
  const response = await socialFetch(fetcher, TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  }, 15_000);
  const data = await readJsonObject(response);
  if (!response.ok) {
    if (transientStatus(response.status)) throw new SocialError("provider_unavailable");
    // A refresh token that LinkedIn no longer accepts is a revoked connection.
    if (kind === "refresh" && data?.error === "invalid_grant") throw new SocialError("token_invalid");
    throw new SocialError("provider_rejected");
  }
  const accessToken = asString(data?.access_token);
  const expiresIn = asNumber(data?.expires_in);
  if (!accessToken || expiresIn === null || expiresIn <= 0) throw new SocialError("provider_rejected");
  const refreshToken = asString(data?.refresh_token);
  const refreshTtl = asNumber(data?.refresh_token_expires_in);
  const scope = asString(data?.scope);
  return {
    accessToken, refreshToken, idToken: asString(data?.id_token),
    accessExpiresAt: secondsFromNow(now, expiresIn) as Date,
    refreshExpiresAt: refreshToken
      ? secondsFromNow(now, refreshTtl ?? (kind === "exchange" ? DEFAULT_REFRESH_TTL_SECONDS : null))
      : null,
    scopes: scope ? scope.split(/[,\s]+/u).filter(Boolean).slice(0, 50) : [...LINKEDIN_LEGACY_SCOPES],
  };
}

export function linkedinExchangeCode(
  env: Environment, fetcher: Fetcher, code: string, redirectUri: string, now = Date.now(),
) {
  return tokenRequest(env, fetcher, { grant_type: "authorization_code", code, redirect_uri: redirectUri }, now, "exchange");
}

export function linkedinRefresh(env: Environment, fetcher: Fetcher, refreshToken: string, now = Date.now()) {
  return tokenRequest(env, fetcher, { grant_type: "refresh_token", refresh_token: refreshToken }, now, "refresh");
}

function bearer(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

function restHeaders(accessToken: string): Record<string, string> {
  return { ...bearer(accessToken), "Linkedin-Version": LINKEDIN_VERSION, "X-Restli-Protocol-Version": "2.0.0" };
}

// OpenID userinfo: sub is the member id used in urn:li:person:{sub}.
export async function linkedinUserInfo(fetcher: Fetcher, accessToken: string): Promise<{ id: string; name: string }> {
  const response = await socialFetch(fetcher, "https://api.linkedin.com/v2/userinfo", { headers: bearer(accessToken) });
  if (!response.ok) throw new SocialError(apiFailureCode(response.status));
  const data = await readJsonObject(response);
  const id = asString(data?.sub);
  if (!id || !/^[A-Za-z0-9:_.-]{1,100}$/u.test(id)) throw new SocialError("provider_rejected");
  const name = asString(data?.name) ?? [asString(data?.given_name), asString(data?.family_name)].filter(Boolean).join(" ");
  return { id, name: (name || "LinkedIn").slice(0, 200) };
}

async function administeredOrganizationIds(fetcher: Fetcher, accessToken: string): Promise<string[]> {
  const ids: string[] = [];
  const count = 100;
  for (let start = 0; start < 500; start += count) {
    const response = await socialFetch(fetcher,
      `https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&start=${start}&count=${count}`,
      { headers: restHeaders(accessToken) });
    if (!response.ok) throw new SocialError(apiFailureCode(response.status));
    const elements = (await readJsonObject(response))?.elements;
    if (!Array.isArray(elements)) throw new SocialError("provider_rejected");
    for (const element of elements) {
      const match = /^urn:li:organization:(\d{1,20})$/u.exec(asString(asRecord(element)?.organization) ?? "");
      if (match && !ids.includes(match[1])) ids.push(match[1]);
    }
    if (elements.length < count || ids.length >= MAX_ORGANIZATIONS) break;
  }
  return ids.slice(0, MAX_ORGANIZATIONS);
}

// Publishable LinkedIn identities: the member plus every organization where they are an approved
// ADMINISTRATOR. A failed organization lookup degrades to a generic name instead of dropping the page.
export async function linkedinAdminPages(
  fetcher: Fetcher, accessToken: string, person: { id: string; name: string },
): Promise<LinkedInMirrorPage[]> {
  const pages: LinkedInMirrorPage[] = [{ id: person.id, name: person.name, type: "PERSON" }];
  const ids = await administeredOrganizationIds(fetcher, accessToken);
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const response = await socialFetch(fetcher,
      `https://api.linkedin.com/rest/organizations?ids=List(${batch.join(",")})`, { headers: restHeaders(accessToken) });
    if (!response.ok && transientStatus(response.status)) throw new SocialError("provider_unavailable");
    if (response.status === 401) throw new SocialError("token_invalid");
    const results = response.ok ? asRecord((await readJsonObject(response))?.results) : null;
    for (const id of batch) {
      const org = asRecord(results?.[id]);
      const vanityName = asString(org?.vanityName);
      pages.push({
        id, type: "ORGANIZATION",
        name: (asString(org?.localizedName) ?? `Organización ${id}`).slice(0, 200),
        ...(vanityName ? { vanityName: vanityName.slice(0, 100) } : {}),
      });
    }
  }
  return pages;
}
