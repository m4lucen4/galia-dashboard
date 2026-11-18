// n8n coexistence (S14): until the cutover, n8n reads the tokens from userData.linkedln_data /
// userData.instagram_data. These helpers write exactly the fields and shapes the old browser
// code wrote (src/redux/actions/SocialNetworksActions.ts), merged into the existing JSON so
// unknown keys survive. The source of truth is social_connections / social_credentials.
import { logSocialError } from "./social-errors.ts";
import type { MirrorColumn, UserDataAccess } from "./social-store.ts";

// The scopes the old LinkedIn flow wrote; used only when LinkedIn does not report the granted ones.
export const LINKEDIN_LEGACY_SCOPES = [
  "openid", "profile", "w_member_social", "email", "r_organization_admin", "w_organization_social",
  "r_basicprofile", "rw_organization_admin", "r_organization_social",
];

type Json = Record<string, unknown>;

export interface LinkedInMirrorConnect {
  personId: string;
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  tokenExpiresAt: Date;
  scopes: string[];
  userName: string;
  connectedAt: Date;
}

export interface LinkedInMirrorPage {
  id: string;
  name: string;
  type: "PERSON" | "ORGANIZATION";
  vanityName?: string;
  logoUrl?: string;
}

export interface InstagramMirrorConnect {
  userId: string;
  name: string;
  accessToken: string;
  tokenExpiresAt: Date;
  dataAccessExpiresAt: Date | null;
  appId: string | null;
  connectedAt: Date;
  scopes: string[];
  granularScopes: unknown[];
  tokenType: string | null;
  application: string | null;
  issuedAt: Date | null;
}

// Page as the old instagram-fetch-admin-pages returned it (page_access_token included, n8n needs it).
export interface InstagramMirrorPage {
  facebook_page_id: string;
  facebook_page_name: string;
  facebook_page_category: string | null;
  instagram_business_account_id: string;
  instagram_username: string | null;
  instagram_name: string | null;
  instagram_profile_picture: string | null;
  instagram_followers_count: number | null;
  instagram_media_count: number | null;
  instagram_biography: string | null;
  page_access_token: string;
  permissions: string[];
}

const LINKEDIN_CONNECT_KEYS = [
  "linkedin_person_id", "access_token", "refresh_token", "id_token", "token_expires_at", "is_connected",
  "permissions_granted", "user_name", "connected_at",
];
const INSTAGRAM_CONNECT_KEYS = [
  "instagram_user_id", "access_token", "token_expires_at", "data_access_expires_at", "is_connected", "username",
  "user_id", "app_id", "connected_at", "permissions_granted", "granular_scopes", "token_type", "application",
  "issued_at",
];

// Result of a mirror write. Never a silent no-op: a missing userData row is its own outcome.
//   written           the column was rewritten
//   unchanged         nothing to do (already in sync)
//   no_data           the row exists but the column has no JSON to merge into
//   user_data_missing there is no userData row for the user
export type MirrorOutcome = "written" | "unchanged" | "no_data" | "user_data_missing";

// Last write wins; a lost race only delays n8n until the next daily check (which re-syncs LinkedIn).
// `change` returns the new JSON, "unchanged" when already in sync, or null when there is nothing to merge into.
async function update(
  access: UserDataAccess, userId: string, column: MirrorColumn,
  change: (current: Json | null) => Json | null | "unchanged",
): Promise<MirrorOutcome> {
  const { exists, value } = await access.readUserData(userId, column);
  if (!exists) return "user_data_missing";
  const next = change(value);
  if (next === "unchanged") return "unchanged";
  if (!next) return "no_data";
  await access.writeUserData(userId, column, next);
  return "written";
}

function withoutKeys(source: Json, keys: string[]): Json {
  const copy = { ...source };
  for (const key of keys) delete copy[key];
  return copy;
}

// The old client wrote a fixed list whatever LinkedIn granted; n8n may rely on it. Keep that list
// first and add whatever else LinkedIn returned, without duplicates.
export function linkedInPermissions(returned: string[]): string[] {
  return [...new Set([...LINKEDIN_LEGACY_SCOPES, ...returned])];
}

export function mirrorLinkedInConnect(access: UserDataAccess, userId: string, data: LinkedInMirrorConnect) {
  return update(access, userId, "linkedln_data", (current) => {
    const base = current ?? {};
    // Another account means another page list (the old flow replaced the whole object).
    const sameAccount = base.linkedin_person_id === data.personId;
    const kept = withoutKeys(base, [
      ...LINKEDIN_CONNECT_KEYS, ...(sameAccount ? [] : ["admin_pages", "pages_fetched_at"]),
    ]);
    return {
      ...kept,
      linkedin_person_id: data.personId,
      access_token: data.accessToken,
      ...(data.refreshToken ? { refresh_token: data.refreshToken } : {}),
      ...(data.idToken ? { id_token: data.idToken } : {}),
      token_expires_at: data.tokenExpiresAt.toISOString(),
      is_connected: true,
      permissions_granted: linkedInPermissions(data.scopes),
      user_name: data.userName,
      connected_at: data.connectedAt.toISOString(),
    };
  });
}

export function mirrorLinkedInPages(access: UserDataAccess, userId: string, pages: LinkedInMirrorPage[]) {
  return update(access, userId, "linkedln_data", (current) =>
    current ? { ...current, admin_pages: pages, pages_fetched_at: new Date().toISOString() } : null);
}

// Idempotent re-sync by the worker, on every LinkedIn check: when the access token n8n reads differs
// from the current server token, rewrite access_token / token_expires_at (and refresh_token when there
// is one) and keep every other key. Repairs a mirror write that failed after a refresh.
export function syncLinkedInMirror(
  access: UserDataAccess, userId: string,
  server: { accessToken: string; tokenExpiresAt: Date | null; refreshToken: string | null },
) {
  return update(access, userId, "linkedln_data", (current) => {
    if (!current) return null;
    if (current.access_token === server.accessToken) return "unchanged";
    return {
      ...current,
      access_token: server.accessToken,
      ...(server.tokenExpiresAt ? { token_expires_at: server.tokenExpiresAt.toISOString() } : {}),
      ...(server.refreshToken ? { refresh_token: server.refreshToken } : {}),
    };
  });
}

// Same as the old disconnect: only is_connected changes, and only when there is data.
export function mirrorDisconnect(access: UserDataAccess, userId: string, column: MirrorColumn) {
  return update(access, userId, column, (current) => current ? { ...current, is_connected: false } : null);
}

export function mirrorInstagramConnect(
  access: UserDataAccess, userId: string, data: InstagramMirrorConnect, pages: InstagramMirrorPage[] | null,
) {
  return update(access, userId, "instagram_data", (current) => {
    const base = current ?? {};
    const sameAccount = base.instagram_user_id === data.userId;
    // Pages of a previous account are dropped; same account keeps them when the fetch failed.
    const kept = withoutKeys(base, [
      ...INSTAGRAM_CONNECT_KEYS, ...(sameAccount || pages ? [] : ["business_pages", "pages_fetched_at"]),
    ]);
    return {
      ...kept,
      instagram_user_id: data.userId,
      access_token: data.accessToken,
      token_expires_at: data.tokenExpiresAt.toISOString(),
      data_access_expires_at: data.dataAccessExpiresAt ? data.dataAccessExpiresAt.toISOString() : null,
      is_connected: true,
      username: data.name,
      user_id: data.userId,
      app_id: data.appId,
      connected_at: data.connectedAt.toISOString(),
      permissions_granted: data.scopes,
      granular_scopes: data.granularScopes,
      token_type: data.tokenType,
      application: data.application,
      issued_at: data.issuedAt ? data.issuedAt.toISOString() : null,
      ...(pages ? { business_pages: pages, pages_fetched_at: new Date().toISOString() } : {}),
    };
  });
}

export function mirrorInstagramPages(access: UserDataAccess, userId: string, pages: InstagramMirrorPage[]) {
  return update(access, userId, "instagram_data", (current) =>
    current ? { ...current, business_pages: pages, pages_fetched_at: new Date().toISOString() } : null);
}

// A mirror failure must not undo a stored connection: log the code only and carry on.
// A missing userData row is logged with its own code (no tokens, no ids) and returned as an outcome.
export async function safeMirror(scope: string, run: () => Promise<MirrorOutcome>): Promise<MirrorOutcome | "failed"> {
  try {
    const outcome = await run();
    if (outcome === "user_data_missing") console.error(`[${scope}:mirror] user_data_missing`);
    return outcome;
  } catch (error) {
    logSocialError(`${scope}:mirror`, error);
    return "failed";
  }
}
