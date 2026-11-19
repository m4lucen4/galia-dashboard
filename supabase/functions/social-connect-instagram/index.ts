import { corsHeaders, jsonResponse, logSocialError, SocialError, socialFailure } from "../_shared/social-errors.ts";
import {
  FACEBOOK_PUBLISH_SCOPE, facebookPageRecords, facebookPages, instagramDebugToken, instagramLongLivedToken,
  instagramMe, instagramPageRecords, instagramPages, instagramShortLivedToken, PUBLISH_SCOPE,
} from "../_shared/social-instagram.ts";
import {
  type InstagramMirrorPage, mirrorDisconnect, mirrorInstagramConnect, mirrorInstagramPages, safeMirror,
} from "../_shared/social-n8n-mirror.ts";
import {
  bearerAuthorization, parseAction, parseAuthorizationCode, parseRedirectUri, readJsonBody,
} from "../_shared/social-request.ts";
import {
  type ConnectionSummary, createSocialStore, type Environment, type SocialStore,
} from "../_shared/social-store.ts";

const actions = ["exchange", "pages", "status", "disconnect"] as const;
const SCOPE = "social-connect-instagram";
// Meta long-lived user tokens last about 60 days.
const DEFAULT_TOKEN_SECONDS = 60 * 24 * 3600;

// Current facebook row, or null when it does not exist or cannot be read (never fails the request).
async function currentFacebook(store: SocialStore, userId: string): Promise<ConnectionSummary | null> {
  try {
    return await store.forUser(userId, "facebook");
  } catch (error) {
    logSocialError(`${SCOPE}:facebook`, error);
    return null;
  }
}

// Refreshes the Facebook Pages of an existing, not disconnected facebook row. Non-fatal: returns the
// summary it has (the refreshed one, else the current row) or null.
async function refreshFacebookPages(store: SocialStore, fetcher: typeof fetch, userId: string) {
  let facebook = await currentFacebook(store, userId);
  if (!facebook || facebook.status === "disconnected") return facebook;
  try {
    const access = (await store.credentials(facebook.id)).find((c) => c.kind === "user_access");
    if (!access) return facebook;
    const records = facebookPageRecords(await facebookPages(fetcher, access.token));
    facebook = await store.setPages(userId, "facebook", records.pages, records.credentials);
  } catch (error) {
    logSocialError(`${SCOPE}:facebook`, error);
  }
  return facebook;
}

// Instagram connection for the signed-in user (S16/S17), plus the Facebook Pages of the same Meta
// login (facebook row, S3). Tokens (user and page) never leave the server: the browser gets the
// connection summaries only. userData.instagram_data is mirrored for n8n (S14); Facebook has no mirror.
export function createHandler(env: Environment, fetcher: typeof fetch = fetch, clock: () => number = Date.now) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (request.method !== "POST") return jsonResponse(socialFailure(new SocialError("invalid_request")).body, 405);
    try {
      const authorization = bearerAuthorization(request);
      const body = await readJsonBody(request);
      const action = parseAction(body, actions);
      const store = createSocialStore(env, fetcher);
      const userId = await store.getUser(authorization);

      if (action === "status") {
        const connection = await store.forUser(userId, "instagram");
        return jsonResponse({ connection, facebook: await currentFacebook(store, userId) });
      }

      if (action === "disconnect") {
        const connection = await store.disconnect(userId, "instagram");
        // One Meta login: the Facebook row goes with it. A failure here does not undo the Instagram one.
        let facebook: ConnectionSummary | { status: "disconnected" } | null = null;
        try {
          facebook = await store.disconnect(userId, "facebook");
        } catch (error) {
          logSocialError(`${SCOPE}:facebook`, error);
        }
        await safeMirror(SCOPE, () => mirrorDisconnect(store, userId, "instagram_data"));
        return jsonResponse({ connection, facebook });
      }

      if (action === "exchange") {
        const code = parseAuthorizationCode(body.code);
        const redirectUri = parseRedirectUri(body.redirectUri, env);
        const now = clock();
        const shortToken = await instagramShortLivedToken(env, fetcher, code, redirectUri);
        const longLived = await instagramLongLivedToken(env, fetcher, shortToken);
        const debug = await instagramDebugToken(env, fetcher, longLived.token);
        if (!debug.isValid) throw new SocialError("token_invalid");
        if (!debug.scopes.includes(PUBLISH_SCOPE)) throw new SocialError("permission_missing");
        const me = await instagramMe(fetcher, longLived.token);
        const tokenExpiresAt = debug.expiresAt ??
          new Date(now + (longLived.expiresInSeconds ?? DEFAULT_TOKEN_SECONDS) * 1000);

        let connection = await store.store({
          userId, network: "instagram", accountId: me.id, accountName: me.name, scopes: debug.scopes.slice(0, 50),
          accessExpiresAt: debug.expiresAt, refreshExpiresAt: null, dataAccessExpiresAt: debug.dataAccessExpiresAt,
          credentials: [{
            kind: "user_access", token: longLived.token, expiresAt: debug.expiresAt?.toISOString() ?? null,
          }],
        });

        // Fetch the pages right away; if that fails the connection stays and `pages` can be retried.
        let pages: InstagramMirrorPage[] | null = null;
        try {
          pages = await instagramPages(fetcher, longLived.token);
          const records = instagramPageRecords(pages);
          connection = await store.setPages(userId, "instagram", records.pages, records.credentials);
        } catch (error) {
          pages = null;
          logSocialError(`${SCOPE}:pages`, error);
        }

        // Facebook Pages only when the Meta login granted pages_manage_posts; any failure is logged and
        // never fails the Instagram connection.
        let facebook: ConnectionSummary | null = null;
        if (debug.scopes.includes(FACEBOOK_PUBLISH_SCOPE)) {
          try {
            facebook = await store.store({
              userId, network: "facebook", accountId: me.id, accountName: me.name, scopes: debug.scopes.slice(0, 50),
              accessExpiresAt: debug.expiresAt, refreshExpiresAt: null, dataAccessExpiresAt: debug.dataAccessExpiresAt,
              credentials: [{
                kind: "user_access", token: longLived.token, expiresAt: debug.expiresAt?.toISOString() ?? null,
              }],
            });
            try {
              const records = facebookPageRecords(await facebookPages(fetcher, longLived.token));
              facebook = await store.setPages(userId, "facebook", records.pages, records.credentials);
            } catch (error) {
              logSocialError(`${SCOPE}:facebook-pages`, error);
            }
          } catch (error) {
            logSocialError(`${SCOPE}:facebook`, error);
          }
        } else {
          facebook = await currentFacebook(store, userId);
        }

        await safeMirror(SCOPE, () => mirrorInstagramConnect(store, userId, {
          userId: me.id, name: me.name, accessToken: longLived.token, tokenExpiresAt,
          dataAccessExpiresAt: debug.dataAccessExpiresAt, appId: debug.appId, connectedAt: new Date(now),
          scopes: debug.scopes, granularScopes: debug.granularScopes, tokenType: debug.type,
          application: debug.application, issuedAt: debug.issuedAt,
        }, pages));
        return jsonResponse({ connection, facebook });
      }

      // pages: refresh the Instagram business accounts reachable through the user's Facebook pages.
      const current = await store.forUser(userId, "instagram");
      if (!current || current.status === "disconnected") throw new SocialError("not_connected");
      const access = (await store.credentials(current.id)).find((c) => c.kind === "user_access");
      if (!access) throw new SocialError("not_connected");
      const pages = await instagramPages(fetcher, access.token);
      const records = instagramPageRecords(pages);
      const connection = await store.setPages(userId, "instagram", records.pages, records.credentials);
      await safeMirror(SCOPE, () => mirrorInstagramPages(store, userId, pages));
      return jsonResponse({ connection, facebook: await refreshFacebookPages(store, fetcher, userId) });
    } catch (error) {
      logSocialError(SCOPE, error);
      const failure = socialFailure(error);
      return jsonResponse(failure.body, failure.status);
    }
  };
}

if (typeof Deno !== "undefined") Deno.serve(createHandler((name) => Deno.env.get(name)));
