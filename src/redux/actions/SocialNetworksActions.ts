import { createAsyncThunk } from "@reduxjs/toolkit";
import { FunctionsHttpError } from "@supabase/supabase-js";
import i18n from "../../i18n";
import { supabase } from "../../helpers/supabase";
import {
  FacebookPage,
  InstagramBusinessPage,
  LinkedInPage,
  SocialConnection,
  SocialConnectionNetwork,
  SocialConnectionPage,
  SocialConnectionStatus,
} from "../../types";

const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
const LINKEDIN_REDIRECT_URI =
  import.meta.env.VITE_LINKEDIN_REDIRECT_URI ||
  `${window.location.origin}/auth/linkedin/callback`;
const LINKEDIN_SCOPE =
  "openid profile w_member_social email r_organization_admin rw_organization_admin r_organization_social w_organization_social r_basicprofile";

const INSTAGRAM_APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID;
const INSTAGRAM_REDIRECT_URI =
  import.meta.env.VITE_INSTAGRAM_REDIRECT_URI ||
  `${window.location.origin}/auth/instagram/callback`;

// ---------------------------------------------------------------------------
// Server contract (docs/social-connections.md): the browser never sees tokens.
// Edge Functions social-connect-linkedin / social-connect-instagram answer
// { connection } or { code, message, retryable }. Health is read from the
// social_connections table (owner RLS).
// ---------------------------------------------------------------------------

type SocialConnectAction = "exchange" | "pages" | "status" | "disconnect";

const CONNECT_FUNCTIONS: Record<SocialConnectionNetwork, string> = {
  linkedin: "social-connect-linkedin",
  instagram: "social-connect-instagram",
  // Facebook Pages share the Meta login: same Edge Function as Instagram.
  facebook: "social-connect-instagram",
};

export const FACEBOOK_PUBLISH_SCOPE = "pages_manage_posts";

const CONNECTION_COLUMNS =
  "id, network, status, status_reason, account_id, account_name, pages, scopes, expires_at, access_expires_at, refresh_expires_at, data_access_expires_at, connected_at, last_checked_at";

const CONNECTION_STATUSES: SocialConnectionStatus[] = [
  "connected",
  "expiring",
  "expired",
  "revoked",
  "error",
  "disconnected",
];

class SocialConnectError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message = "", retryable = false) {
    super(message || code);
    this.code = code;
    this.retryable = retryable;
  }
}

type RawRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is RawRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

// Accepts both the table row (snake_case) and the function summary (camelCase).
const pick = (raw: RawRecord, snake: string, camel: string): unknown =>
  raw[snake] ?? raw[camel];

const normalizePages = (value: unknown): SocialConnectionPage[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).flatMap((page) => {
    const id = asString(page.id);
    if (!id) return [];
    return [
      {
        id,
        name: asString(page.name) ?? "",
        type: asString(page.type) ?? undefined,
        vanityName: asString(page.vanityName) ?? undefined,
        username: asString(page.username) ?? undefined,
        facebookPageId: asString(page.facebookPageId) ?? undefined,
        facebookPageName: asString(page.facebookPageName) ?? undefined,
        instagramId: asString(page.instagramId) ?? undefined,
        instagramUsername: asString(page.instagramUsername) ?? undefined,
      },
    ];
  });
};

const normalizeScopes = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((scope): scope is string => typeof scope === "string")
    : [];

export const normalizeSocialConnection = (
  raw: unknown
): SocialConnection | null => {
  if (!isRecord(raw)) return null;
  const network = raw.network;
  const status = raw.status;
  if (
    network !== "linkedin" &&
    network !== "instagram" &&
    network !== "facebook"
  ) {
    return null;
  }
  if (!CONNECTION_STATUSES.includes(status as SocialConnectionStatus)) {
    return null;
  }

  return {
    id: asString(raw.id) ?? "",
    network,
    status: status as SocialConnectionStatus,
    statusReason: asString(pick(raw, "status_reason", "statusReason")),
    accountId: asString(pick(raw, "account_id", "accountId")),
    accountName: asString(pick(raw, "account_name", "accountName")),
    pages: normalizePages(raw.pages),
    scopes: normalizeScopes(raw.scopes),
    expiresAt: asString(pick(raw, "expires_at", "expiresAt")),
    accessExpiresAt: asString(
      pick(raw, "access_expires_at", "accessExpiresAt")
    ),
    refreshExpiresAt: asString(
      pick(raw, "refresh_expires_at", "refreshExpiresAt")
    ),
    dataAccessExpiresAt: asString(
      pick(raw, "data_access_expires_at", "dataAccessExpiresAt")
    ),
    connectedAt: asString(pick(raw, "connected_at", "connectedAt")),
    lastCheckedAt: asString(pick(raw, "last_checked_at", "lastCheckedAt")),
  };
};

export const isConnectionActive = (
  connection: SocialConnection | null
): boolean =>
  connection?.status === "connected" || connection?.status === "expiring";

export const toLinkedInPages = (
  connection: SocialConnection | null
): LinkedInPage[] =>
  (connection?.pages ?? []).map((page) => ({
    id: page.id,
    name: page.name,
    type: page.type === "ORGANIZATION" ? "ORGANIZATION" : "PERSON",
    vanityName: page.vanityName,
    logoUrl: null,
  }));

// Instagram pages map to the legacy shape WITHOUT page_access_token.
export const toInstagramPages = (
  connection: SocialConnection | null
): InstagramBusinessPage[] =>
  (connection?.pages ?? []).map((page) => ({
    instagram_business_account_id: page.id,
    instagram_username: page.username ?? page.name,
    instagram_name: page.name,
    facebook_page_id: page.facebookPageId ?? "",
    facebook_page_name: page.facebookPageName ?? "",
  }));

export const toFacebookPages = (
  connection: SocialConnection | null
): FacebookPage[] =>
  (connection?.pages ?? []).map((page) => ({
    id: page.id,
    name: page.name,
    type: "PAGE",
    instagramId: page.instagramId,
    instagramUsername: page.instagramUsername,
  }));

export const hasFacebookPublishScope = (
  connection: SocialConnection | null
): boolean => connection?.scopes.includes(FACEBOOK_PUBLISH_SCOPE) ?? false;

// OAuth `state` (CSRF): 32 random bytes from the Web Crypto CSPRNG, hex encoded.
const generateOAuthState = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
};

const parseFunctionFailure = async (
  error: unknown
): Promise<SocialConnectError> => {
  if (error instanceof FunctionsHttpError) {
    try {
      const body: unknown = await error.context.json();
      if (isRecord(body) && typeof body.code === "string") {
        return new SocialConnectError(
          body.code,
          typeof body.message === "string" ? body.message : "",
          body.retryable === true
        );
      }
    } catch {
      // Body is not JSON: fall through to the generic server error.
    }
    return new SocialConnectError("server_error", "", true);
  }
  return new SocialConnectError("network_error", "", true);
};

// Maps a server { code } to a localized, user-facing message.
export const socialErrorMessage = (error: unknown): string => {
  if (error instanceof SocialConnectError) {
    const message = i18n.t(`socialConnections.errors.${error.code}`, {
      defaultValue: i18n.t("socialConnections.errors.unknown"),
    });
    return error.retryable
      ? `${message} ${i18n.t("socialConnections.errors.retryHint")}`
      : message;
  }
  return i18n.t("socialConnections.errors.unknown");
};

const invokeSocialConnect = async (
  network: SocialConnectionNetwork,
  action: SocialConnectAction,
  params: Record<string, unknown> = {}
): Promise<SocialConnection> => {
  const { data, error } = await supabase.functions.invoke(
    CONNECT_FUNCTIONS[network],
    { body: { action, ...params } }
  );

  if (error) throw await parseFunctionFailure(error);

  if (isRecord(data) && typeof data.code === "string") {
    throw new SocialConnectError(
      data.code,
      typeof data.message === "string" ? data.message : "",
      data.retryable === true
    );
  }

  const connection = isRecord(data)
    ? normalizeSocialConnection(data.connection)
    : null;
  if (!connection) throw new SocialConnectError("invalid_response");
  return connection;
};

const readSocialConnection = async (
  network: SocialConnectionNetwork
): Promise<SocialConnection | null> => {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data, error } = await supabase
    .from("social_connections")
    .select(CONNECTION_COLUMNS)
    .eq("user_id", authData.user.id)
    .eq("network", network)
    .maybeSingle();

  if (error) throw new SocialConnectError("read_failed", error.message, true);
  return normalizeSocialConnection(data);
};

// After the exchange the page list may still be empty (LinkedIn): ask the server once.
const exchangeAndLoadPages = async (
  network: SocialConnectionNetwork,
  code: string,
  redirectUri: string
): Promise<SocialConnection> => {
  const connection = await invokeSocialConnect(network, "exchange", {
    code,
    redirectUri,
  });
  if (connection.pages.length > 0) return connection;

  try {
    return await invokeSocialConnect(network, "pages");
  } catch (pagesError) {
    console.error(`Error loading ${network} pages after connecting:`, pagesError);
    return connection;
  }
};

// The Facebook row is written by the same Meta login. The browser reads it from
// social_connections like the Instagram one. undefined = could not be read: keep what the UI has.
export type MetaConnections = {
  connection: SocialConnection | null;
  facebook: SocialConnection | null | undefined;
};

const readFacebookSafely = async (): Promise<
  SocialConnection | null | undefined
> => {
  try {
    return await readSocialConnection("facebook");
  } catch (error) {
    console.error("Error reading Facebook connection:", error);
    return undefined;
  }
};

export const initiateLinkedInAuth = createAsyncThunk(
  "socialNetworks/initiateLinkedInAuth",
  async (_, { rejectWithValue }) => {
    try {
      // Generate a random state string to prevent CSRF attacks
      const state = generateOAuthState();

      // Save the state in localStorage
      localStorage.setItem("linkedln_auth_state", state);

      // Build the LinkedIn authorization URL
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        LINKEDIN_REDIRECT_URI
      )}&state=${state}&scope=${encodeURIComponent(LINKEDIN_SCOPE)}`;

      // Redirect the user to LinkedIn for authorization
      window.location.href = authUrl;

      return true;
    } catch (error) {
      console.error("Error initiating LinkedIn auth:", error);
      return rejectWithValue(i18n.t("socialConnections.errors.initiate"));
    }
  }
);

export const processLinkedInCallback = createAsyncThunk(
  "socialNetworks/processLinkedInCallback",
  async (
    { code, state }: { code: string; state: string },
    { rejectWithValue }
  ) => {
    // Verify the state parameter to prevent CSRF attacks
    const savedState = localStorage.getItem("linkedln_auth_state");
    if (state !== savedState) {
      return rejectWithValue(i18n.t("socialConnections.errors.state_mismatch"));
    }
    localStorage.removeItem("linkedln_auth_state");

    try {
      return await exchangeAndLoadPages(
        "linkedin",
        code,
        LINKEDIN_REDIRECT_URI
      );
    } catch (error) {
      console.error("Error processing LinkedIn callback:", error);
      return rejectWithValue(socialErrorMessage(error));
    }
  }
);

export const disconnectLinkedIn = createAsyncThunk(
  "socialNetworks/disconnectLinkedIn",
  async (_, { rejectWithValue }) => {
    try {
      return await invokeSocialConnect("linkedin", "disconnect");
    } catch (error) {
      console.error("Error disconnecting LinkedIn:", error);
      return rejectWithValue(socialErrorMessage(error));
    }
  }
);

export const checkLinkedInConnection = createAsyncThunk(
  "socialNetworks/checkLinkedInConnection",
  async (_, { rejectWithValue }) => {
    try {
      return await readSocialConnection("linkedin");
    } catch (error) {
      console.error("Error checking LinkedIn connection:", error);
      return rejectWithValue(socialErrorMessage(error));
    }
  }
);

// Asks the server to refresh the publishable pages (action "pages").
export const fetchLinkedInPages = createAsyncThunk(
  "socialNetworks/fetchLinkedInPages",
  async (_, { rejectWithValue }) => {
    try {
      return await invokeSocialConnect("linkedin", "pages");
    } catch (error) {
      console.error("Error fetching LinkedIn admin pages:", error);
      return rejectWithValue(socialErrorMessage(error));
    }
  }
);

export const initiateInstagramAuth = createAsyncThunk(
  "socialNetworks/initiateInstagramAuth",
  async (_, { rejectWithValue }) => {
    try {
      const state = generateOAuthState();
      localStorage.setItem("instagram_auth_state", state);

      const authUrl = `https://www.facebook.com/v27.0/dialog/oauth?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(
        INSTAGRAM_REDIRECT_URI
      )}&state=${state}&response_type=code&scope=pages_show_list,instagram_basic,instagram_content_publish,business_management,pages_read_engagement,pages_manage_posts`;

      window.location.href = authUrl;
      return true;
    } catch (error) {
      console.error("Error initiating Instagram auth:", error);
      return rejectWithValue(i18n.t("socialConnections.errors.initiate"));
    }
  }
);

export const processInstagramCallback = createAsyncThunk(
  "socialNetworks/processInstagramCallback",
  async (
    { code, state }: { code: string; state: string },
    { rejectWithValue }
  ) => {
    const savedState = localStorage.getItem("instagram_auth_state");
    if (state !== savedState) {
      return rejectWithValue(i18n.t("socialConnections.errors.state_mismatch"));
    }
    localStorage.removeItem("instagram_auth_state");

    try {
      const connection = await exchangeAndLoadPages(
        "instagram",
        code,
        INSTAGRAM_REDIRECT_URI
      );
      const facebook = await readFacebookSafely();
      return { connection, facebook } satisfies MetaConnections;
    } catch (error) {
      console.error("Error processing Instagram callback:", error);
      return rejectWithValue(socialErrorMessage(error));
    }
  }
);

export const disconnectInstagram = createAsyncThunk(
  "socialNetworks/disconnectInstagram",
  async (_, { rejectWithValue }) => {
    try {
      // The server disconnects the Instagram and Facebook rows (one Meta login).
      const connection = await invokeSocialConnect("instagram", "disconnect");
      return { connection, facebook: null } satisfies MetaConnections;
    } catch (error) {
      console.error("Error disconnecting Instagram:", error);
      return rejectWithValue(socialErrorMessage(error));
    }
  }
);

export const checkInstagramConnection = createAsyncThunk(
  "socialNetworks/checkInstagramConnection",
  async (_, { rejectWithValue }) => {
    try {
      const [connection, facebook] = await Promise.all([
        readSocialConnection("instagram"),
        readSocialConnection("facebook"),
      ]);
      return { connection, facebook } satisfies MetaConnections;
    } catch (error) {
      console.error("Error checking Instagram connection:", error);
      return rejectWithValue(socialErrorMessage(error));
    }
  }
);

export const fetchInstagramPages = createAsyncThunk(
  "socialNetworks/fetchInstagramPages",
  async (_, { rejectWithValue }) => {
    try {
      const connection = await invokeSocialConnect("instagram", "pages");
      const facebook = await readFacebookSafely();
      return { connection, facebook } satisfies MetaConnections;
    } catch (error) {
      console.error("Error fetching Instagram business pages:", error);
      return rejectWithValue(socialErrorMessage(error));
    }
  }
);
