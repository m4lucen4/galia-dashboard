import { corsHeaders, jsonResponse, logSocialError, SocialError, socialFailure } from "../_shared/social-errors.ts";
import {
  instagramDebugToken, instagramLongLivedToken, instagramMe, instagramPageRecords, instagramPages, PUBLISH_SCOPE,
  instagramShortLivedToken,
} from "../_shared/social-instagram.ts";
import {
  type InstagramMirrorPage, mirrorDisconnect, mirrorInstagramConnect, mirrorInstagramPages, safeMirror,
} from "../_shared/social-n8n-mirror.ts";
import {
  bearerAuthorization, parseAction, parseAuthorizationCode, parseRedirectUri, readJsonBody,
} from "../_shared/social-request.ts";
import { createSocialStore, type Environment } from "../_shared/social-store.ts";

const actions = ["exchange", "pages", "status", "disconnect"] as const;
const SCOPE = "social-connect-instagram";
// Meta long-lived user tokens last about 60 days.
const DEFAULT_TOKEN_SECONDS = 60 * 24 * 3600;

// Instagram connection for the signed-in user (S16/S17). Tokens (user and page) never leave the
// server: the browser gets the connection summary only. userData.instagram_data is mirrored for n8n (S14).
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

      if (action === "status") return jsonResponse({ connection: await store.forUser(userId, "instagram") });

      if (action === "disconnect") {
        const connection = await store.disconnect(userId, "instagram");
        await safeMirror(SCOPE, () => mirrorDisconnect(store, userId, "instagram_data"));
        return jsonResponse({ connection });
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

        await safeMirror(SCOPE, () => mirrorInstagramConnect(store, userId, {
          userId: me.id, name: me.name, accessToken: longLived.token, tokenExpiresAt,
          dataAccessExpiresAt: debug.dataAccessExpiresAt, appId: debug.appId, connectedAt: new Date(now),
          scopes: debug.scopes, granularScopes: debug.granularScopes, tokenType: debug.type,
          application: debug.application, issuedAt: debug.issuedAt,
        }, pages));
        return jsonResponse({ connection });
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
      return jsonResponse({ connection });
    } catch (error) {
      logSocialError(SCOPE, error);
      const failure = socialFailure(error);
      return jsonResponse(failure.body, failure.status);
    }
  };
}

if (typeof Deno !== "undefined") Deno.serve(createHandler((name) => Deno.env.get(name)));
