import type { Environment } from "./publication-generation-store.ts";
import { isSocialFailureCode, SocialError } from "./social-errors.ts";
import { type Fetcher, requiredEnv, socialFetch } from "./social-http.ts";

export type { Environment };
export type Network = "linkedin" | "instagram";

// What social_connection_summary returns (never tokens).
export interface ConnectionSummary {
  id: string;
  userId: string;
  network: Network;
  status: "connected" | "expiring" | "expired" | "revoked" | "error" | "disconnected";
  statusReason: string | null;
  accountId: string | null;
  accountName: string | null;
  scopes: string[];
  pages: Array<Record<string, unknown>>;
  expiresAt: string | null;
  accessExpiresAt: string | null;
  refreshExpiresAt: string | null;
  dataAccessExpiresAt: string | null;
  connectedAt: string | null;
  lastCheckedAt: string | null;
}

export interface CredentialInput {
  kind: "user_access" | "refresh" | "page_access";
  externalId?: string;
  token: string;
  expiresAt?: string | null;
}

export interface StoredCredential {
  kind: "user_access" | "refresh" | "page_access";
  externalId: string | null;
  token: string;
  expiresAt: string | null;
}

export interface NoticeRecipient {
  connection: ConnectionSummary;
  email: string;
  firstName: string | null;
  language: string | null;
}

export interface ConnectionInput {
  userId: string;
  network: Network;
  accountId: string;
  accountName: string | null;
  scopes: string[];
  accessExpiresAt: Date | null;
  refreshExpiresAt: Date | null;
  dataAccessExpiresAt: Date | null;
  credentials: CredentialInput[];
}

export interface ReportInput {
  status: "revoked" | "error" | null;
  reason: string | null;
  accessExpiresAt?: Date | null;
  refreshExpiresAt?: Date | null;
  dataAccessExpiresAt?: Date | null;
  credentials?: CredentialInput[] | null;
  refreshed?: boolean;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const mirrorColumns = ["linkedln_data", "instagram_data"] as const;
export type MirrorColumn = typeof mirrorColumns[number];

const iso = (value: Date | null | undefined) => value ? value.toISOString() : null;

// Native REST keeps the Edge runtime dependency-free. All data access uses the service
// role; user identity comes from Supabase Auth /user, never from a decoded JWT.
export function createSocialStore(env: Environment, fetcher: Fetcher = fetch) {
  const url = requiredEnv(env, "SUPABASE_URL").replace(/\/$/u, "");
  const serviceKey = requiredEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const serviceHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
    const response = await socialFetch(fetcher, `${url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { ...serviceHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => { throw new SocialError("internal_error"); });
    let data: unknown;
    try { data = await response.json(); } catch { throw new SocialError("internal_error"); }
    if (!response.ok) {
      const message = (data as { message?: unknown } | null)?.message;
      throw new SocialError(isSocialFailureCode(message) && message !== "internal_error" ? message : "internal_error");
    }
    return data as T;
  }

  return {
    // Supabase Auth /user is the only identity source.
    async getUser(authorization: string): Promise<string> {
      const anonKey = requiredEnv(env, "SUPABASE_ANON_KEY");
      let response: Response;
      try {
        response = await socialFetch(fetcher, `${url}/auth/v1/user`, {
          headers: { apikey: anonKey, Authorization: authorization },
        });
      } catch { throw new SocialError("internal_error"); }
      if (response.status === 401 || response.status === 403) throw new SocialError("unauthorized");
      if (!response.ok) throw new SocialError("internal_error");
      let user: { id?: unknown };
      try { user = await response.json(); } catch { throw new SocialError("unauthorized"); }
      if (!user || typeof user.id !== "string" || !uuidPattern.test(user.id)) throw new SocialError("unauthorized");
      return user.id;
    },

    store(input: ConnectionInput): Promise<ConnectionSummary> {
      return rpc("social_connection_store", {
        p_user: input.userId, p_network: input.network, p_account_id: input.accountId,
        p_account_name: input.accountName, p_scopes: input.scopes,
        p_access_expires_at: iso(input.accessExpiresAt), p_refresh_expires_at: iso(input.refreshExpiresAt),
        p_data_access_expires_at: iso(input.dataAccessExpiresAt), p_credentials: input.credentials,
      });
    },

    setPages(
      userId: string, network: Network, pages: ReadonlyArray<object>,
      pageCredentials: CredentialInput[] | null,
    ): Promise<ConnectionSummary> {
      return rpc("social_connection_set_pages", {
        p_user: userId, p_network: network, p_pages: pages, p_page_credentials: pageCredentials,
      });
    },

    report(connectionId: string, input: ReportInput): Promise<ConnectionSummary> {
      return rpc("social_connection_report", {
        p_connection: connectionId, p_status: input.status, p_reason: input.reason,
        p_access_expires_at: iso(input.accessExpiresAt), p_refresh_expires_at: iso(input.refreshExpiresAt),
        p_data_access_expires_at: iso(input.dataAccessExpiresAt),
        p_credentials: input.credentials ?? null, p_refreshed: input.refreshed ?? false,
      });
    },

    disconnect(userId: string, network: Network): Promise<ConnectionSummary | { status: "disconnected" }> {
      return rpc("social_connection_disconnect", { p_user: userId, p_network: network });
    },

    forUser(userId: string, network: Network): Promise<ConnectionSummary | null> {
      return rpc("social_connection_for_user", { p_user: userId, p_network: network });
    },

    credentials(connectionId: string): Promise<StoredCredential[]> {
      return rpc("social_credentials_get", { p_connection: connectionId });
    },

    dueCheck(limit: number): Promise<ConnectionSummary[]> {
      return rpc("social_connections_due_check", { p_limit: limit });
    },

    claimNotice(connectionId: string): Promise<NoticeRecipient | null> {
      return rpc("social_connection_claim_notice", { p_connection: connectionId });
    },

    // n8n coexistence: the legacy token blobs on userData. Only the two known columns.
    async readUserData(userId: string, column: MirrorColumn): Promise<Record<string, unknown> | null> {
      if (!uuidPattern.test(userId) || !mirrorColumns.includes(column)) throw new SocialError("internal_error");
      const response = await socialFetch(fetcher, `${url}/rest/v1/userData?uid=eq.${userId}&select=${column}`, {
        headers: { ...serviceHeaders, Accept: "application/json" },
      });
      if (!response.ok) throw new SocialError("internal_error");
      let rows: unknown;
      try { rows = await response.json(); } catch { throw new SocialError("internal_error"); }
      const value = Array.isArray(rows) ? (rows[0] as Record<string, unknown> | undefined)?.[column] : null;
      return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
    },

    async writeUserData(userId: string, column: MirrorColumn, value: Record<string, unknown>): Promise<void> {
      if (!uuidPattern.test(userId) || !mirrorColumns.includes(column)) throw new SocialError("internal_error");
      const response = await socialFetch(fetcher, `${url}/rest/v1/userData?uid=eq.${userId}`, {
        method: "PATCH",
        headers: { ...serviceHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ [column]: value }),
      });
      if (!response.ok) throw new SocialError("internal_error");
    },
  };
}

export type SocialStore = ReturnType<typeof createSocialStore>;
export type UserDataAccess = Pick<SocialStore, "readUserData" | "writeUserData">;
