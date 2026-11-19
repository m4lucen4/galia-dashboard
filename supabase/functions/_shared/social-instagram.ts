// Instagram (Meta Graph API) provider calls shared by social-connect-instagram and
// social-credentials-check. Tokens travel as query parameters because that is how Graph takes
// them; URLs are never logged.
import { SocialError, type SocialFailureCode } from "./social-errors.ts";
import {
  apiFailureCode, asNumber, asRecord, asString, type Fetcher, readJsonObject, requiredEnv, socialFetch,
  transientStatus,
} from "./social-http.ts";
import type { Environment } from "./social-store.ts";
import type { InstagramMirrorPage } from "./social-n8n-mirror.ts";

export const GRAPH_VERSION = "v27.0";
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
export const PUBLISH_SCOPE = "instagram_content_publish";
export const FACEBOOK_PUBLISH_SCOPE = "pages_manage_posts";
const MAX_PAGES = 100;
const PAGE_FIELDS = "id,name,category,tasks,access_token,instagram_business_account" +
  "{id,username,name,profile_picture_url,followers_count,media_count,biography}";

export interface TokenDebug {
  isValid: boolean;
  // null: the token does not expire (Graph reports 0).
  expiresAt: Date | null;
  dataAccessExpiresAt: Date | null;
  scopes: string[];
  granularScopes: unknown[];
  userId: string | null;
  appId: string | null;
  type: string | null;
  application: string | null;
  issuedAt: Date | null;
}

// Graph error classes: https://developers.facebook.com/docs/graph-api/guides/error-handling
function graphFailureCode(status: number, error: Record<string, unknown> | null, oauthStep: boolean): SocialFailureCode {
  const code = asNumber(error?.code);
  if (transientStatus(status) || (code !== null && [1, 2, 4, 17, 32, 341, 613].includes(code))) {
    return "provider_unavailable";
  }
  // A bad authorization code is a rejected request, not a token that went bad.
  if (oauthStep) return "provider_rejected";
  if (code === 190) return "token_invalid";
  if (code === 10 || (code !== null && code >= 200 && code <= 299)) return "permission_missing";
  return status === 401 || status === 403 ? apiFailureCode(status) : "provider_rejected";
}

async function graphGet(
  fetcher: Fetcher, urlOrPath: string, params: Record<string, string>, oauthStep = false,
): Promise<Record<string, unknown>> {
  const url = urlOrPath.startsWith("https://")
    ? urlOrPath : `${GRAPH_BASE}/${urlOrPath}?${new URLSearchParams(params).toString()}`;
  const response = await socialFetch(fetcher, url, { headers: { Accept: "application/json" } }, 15_000);
  const data = await readJsonObject(response);
  if (!response.ok) throw new SocialError(graphFailureCode(response.status, asRecord(data?.error), oauthStep));
  if (!data) throw new SocialError("provider_unavailable");
  return data;
}

export async function instagramShortLivedToken(
  env: Environment, fetcher: Fetcher, code: string, redirectUri: string,
): Promise<string> {
  const data = await graphGet(fetcher, "oauth/access_token", {
    client_id: requiredEnv(env, "INSTAGRAM_APP_ID"), client_secret: requiredEnv(env, "INSTAGRAM_APP_SECRET"),
    redirect_uri: redirectUri, code,
  }, true);
  const token = asString(data.access_token);
  if (!token) throw new SocialError("provider_rejected");
  return token;
}

export async function instagramLongLivedToken(
  env: Environment, fetcher: Fetcher, shortToken: string,
): Promise<{ token: string; expiresInSeconds: number | null }> {
  const data = await graphGet(fetcher, "oauth/access_token", {
    grant_type: "fb_exchange_token", client_id: requiredEnv(env, "INSTAGRAM_APP_ID"),
    client_secret: requiredEnv(env, "INSTAGRAM_APP_SECRET"), fb_exchange_token: shortToken,
  }, true);
  const token = asString(data.access_token);
  if (!token) throw new SocialError("provider_rejected");
  return { token, expiresInSeconds: asNumber(data.expires_in) };
}

const seconds = (value: unknown): Date | null => {
  const n = asNumber(value);
  return n && n > 0 ? new Date(n * 1000) : null;
};

// debug_token with the app token. An invalid or expired input token answers 200 with is_valid false.
export async function instagramDebugToken(env: Environment, fetcher: Fetcher, inputToken: string): Promise<TokenDebug> {
  const appId = requiredEnv(env, "INSTAGRAM_APP_ID");
  const data = asRecord((await graphGet(fetcher, "debug_token", {
    input_token: inputToken, access_token: `${appId}|${requiredEnv(env, "INSTAGRAM_APP_SECRET")}`,
  }, true)).data);
  if (!data || typeof data.is_valid !== "boolean") throw new SocialError("provider_rejected");
  const error = asRecord(data.error);
  const invalid = data.is_valid === false || asNumber(error?.code) === 190;
  return {
    isValid: !invalid,
    expiresAt: seconds(data.expires_at),
    dataAccessExpiresAt: seconds(data.data_access_expires_at),
    scopes: Array.isArray(data.scopes) ? data.scopes.filter((s): s is string => typeof s === "string") : [],
    granularScopes: Array.isArray(data.granular_scopes) ? data.granular_scopes : [],
    userId: asString(data.user_id), appId: asString(data.app_id), type: asString(data.type),
    application: asString(data.application), issuedAt: seconds(data.issued_at),
  };
}

export async function instagramMe(fetcher: Fetcher, token: string): Promise<{ id: string; name: string }> {
  const data = await graphGet(fetcher, "me", { fields: "id,name", access_token: token });
  const id = asString(data.id);
  if (!id || !/^[A-Za-z0-9:_.-]{1,100}$/u.test(id)) throw new SocialError("provider_rejected");
  return { id, name: (asString(data.name) ?? "Instagram").slice(0, 200) };
}

const ID_PATTERN = /^[A-Za-z0-9:_.-]{1,100}$/u;

// /me/accounts, one batch of raw page records per Graph page. `isFull` is checked before each request.
async function* accountBatches(
  fetcher: Fetcher, userToken: string, isFull: () => boolean,
): AsyncGenerator<unknown[]> {
  let next: string | null = `${GRAPH_BASE}/me/accounts?${new URLSearchParams({
    fields: PAGE_FIELDS, limit: "50", access_token: userToken,
  }).toString()}`;
  for (let guard = 0; next && guard < 10 && !isFull(); guard++) {
    const data = await graphGet(fetcher, next, {});
    yield Array.isArray(data.data) ? data.data : [];
    // paging.next embeds the token: only follow it on the Graph host.
    const nextUrl = asString(asRecord(data.paging)?.next);
    next = nextUrl && nextUrl.startsWith("https://graph.facebook.com/") ? nextUrl : null;
  }
}

// Facebook pages of the user that have an Instagram business account, with the page token that
// publishing needs. One entry per Instagram account.
export async function instagramPages(fetcher: Fetcher, userToken: string): Promise<InstagramMirrorPage[]> {
  const pages: InstagramMirrorPage[] = [];
  for await (const batch of accountBatches(fetcher, userToken, () => pages.length >= MAX_PAGES)) {
    for (const item of batch) {
      const page = asRecord(item);
      const ig = asRecord(page?.instagram_business_account);
      const igId = asString(ig?.id);
      const pageId = asString(page?.id);
      const token = asString(page?.access_token);
      if (!page || !ig || !igId || !pageId || !token || token.length > 4096) continue;
      if (!ID_PATTERN.test(igId) || !ID_PATTERN.test(pageId)) continue;
      if (pages.some((p) => p.instagram_business_account_id === igId)) continue;
      pages.push({
        facebook_page_id: pageId,
        facebook_page_name: (asString(page.name) ?? "").slice(0, 200),
        facebook_page_category: asString(page.category),
        instagram_business_account_id: igId,
        instagram_username: asString(ig.username),
        instagram_name: asString(ig.name),
        instagram_profile_picture: asString(ig.profile_picture_url),
        instagram_followers_count: asNumber(ig.followers_count),
        instagram_media_count: asNumber(ig.media_count),
        instagram_biography: asString(ig.biography),
        page_access_token: token,
        permissions: Array.isArray(page.tasks) ? page.tasks.filter((t): t is string => typeof t === "string") : [],
      });
    }
  }
  return pages;
}

export interface FacebookPage {
  id: string;
  name: string;
  instagramId: string | null;
  instagramUsername: string | null;
  pageAccessToken: string;
}

// Facebook Pages of the user the app can publish to: the user can perform CREATE_CONTENT on the Page
// and Graph returned a page token. Pages without a linked Instagram account are kept.
export async function facebookPages(fetcher: Fetcher, userToken: string): Promise<FacebookPage[]> {
  const pages: FacebookPage[] = [];
  for await (const batch of accountBatches(fetcher, userToken, () => pages.length >= MAX_PAGES)) {
    for (const item of batch) {
      const page = asRecord(item);
      const pageId = asString(page?.id);
      const token = asString(page?.access_token);
      if (!page || !pageId || !token || token.length > 4096 || !ID_PATTERN.test(pageId)) continue;
      if (!Array.isArray(page.tasks) || !page.tasks.includes("CREATE_CONTENT")) continue;
      if (pages.some((p) => p.id === pageId)) continue;
      const ig = asRecord(page.instagram_business_account);
      const igId = asString(ig?.id);
      pages.push({
        id: pageId,
        name: (asString(page.name) ?? pageId).slice(0, 200),
        instagramId: igId && ID_PATTERN.test(igId) ? igId : null,
        instagramUsername: asString(ig?.username),
        pageAccessToken: token,
      });
    }
  }
  return pages;
}

// Safe projection for social_connections.pages (no tokens) and the page credentials that go with it.
export function instagramPageRecords(pages: InstagramMirrorPage[]) {
  return {
    pages: pages.map((p) => ({
      id: p.instagram_business_account_id,
      name: (p.instagram_username ?? p.instagram_name ?? p.facebook_page_name ?? "Instagram").slice(0, 200),
      type: "BUSINESS",
      ...(p.instagram_username ? { username: p.instagram_username.slice(0, 100) } : {}),
      facebookPageId: p.facebook_page_id,
      facebookPageName: p.facebook_page_name,
    })),
    credentials: pages.map((p) => ({
      kind: "page_access" as const, externalId: p.instagram_business_account_id, token: p.page_access_token,
    })),
  };
}

// Safe projection for the facebook social_connections.pages (no tokens) and the page credentials
// keyed by facebook page id.
export function facebookPageRecords(pages: FacebookPage[]) {
  return {
    pages: pages.map((p) => ({
      id: p.id,
      name: p.name,
      type: "PAGE",
      ...(p.instagramId ? { instagramId: p.instagramId } : {}),
      ...(p.instagramId && p.instagramUsername ? { instagramUsername: p.instagramUsername.slice(0, 100) } : {}),
    })),
    credentials: pages.map((p) => ({
      kind: "page_access" as const, externalId: p.id, token: p.pageAccessToken,
    })),
  };
}
