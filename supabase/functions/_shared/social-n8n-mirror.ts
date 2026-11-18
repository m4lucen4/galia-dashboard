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

// Last write wins; a lost race only delays n8n until the next daily check or reconnection.
async function update(
  access: UserDataAccess, userId: string, column: MirrorColumn, change: (current: Json | null) => Json | null,
): Promise<boolean> {
  const next = change(await access.readUserData(userId, column));
  if (!next) return false;
  await access.writeUserData(userId, column, next);
  return true;
}

function withoutKeys(source: Json, keys: string[]): Json {
  const copy = { ...source };
  for (const key of keys) delete copy[key];
  return copy;
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
      permissions_granted: data.scopes,
      user_name: data.userName,
      connected_at: data.connectedAt.toISOString(),
    };
  });
}

export function mirrorLinkedInPages(access: UserDataAccess, userId: string, pages: LinkedInMirrorPage[]) {
  return update(access, userId, "linkedln_data", (current) =>
    current ? { ...current, admin_pages: pages, pages_fetched_at: new Date().toISOString() } : null);
}

// Token refresh by the worker: access_token / token_expires_at (and a rotated refresh token).
export function mirrorLinkedInRefresh(
  access: UserDataAccess, userId: string,
  data: { accessToken: string; tokenExpiresAt: Date; refreshToken: string | null },
) {
  return update(access, userId, "linkedln_data", (current) => current ? {
    ...current,
    access_token: data.accessToken,
    token_expires_at: data.tokenExpiresAt.toISOString(),
    ...(data.refreshToken ? { refresh_token: data.refreshToken } : {}),
  } : null);
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
export async function safeMirror(scope: string, run: () => Promise<boolean>): Promise<boolean> {
  try { return await run(); } catch (error) {
    logSocialError(`${scope}:mirror`, error);
    return false;
  }
}
