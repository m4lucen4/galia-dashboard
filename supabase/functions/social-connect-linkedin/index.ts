import { corsHeaders, jsonResponse, logSocialError, SocialError, socialFailure } from "../_shared/social-errors.ts";
import { linkedinAdminPages, linkedinExchangeCode, linkedinUserInfo } from "../_shared/social-linkedin.ts";
import {
  mirrorDisconnect, mirrorLinkedInConnect, mirrorLinkedInPages, safeMirror,
} from "../_shared/social-n8n-mirror.ts";
import {
  bearerAuthorization, parseAction, parseAuthorizationCode, parseRedirectUri, readJsonBody,
} from "../_shared/social-request.ts";
import { createSocialStore, type CredentialInput, type Environment } from "../_shared/social-store.ts";

const actions = ["exchange", "pages", "status", "disconnect"] as const;

// LinkedIn connection for the signed-in user (S16/S17). Tokens never leave the server: the
// browser gets the connection summary only. userData.linkedln_data is mirrored for n8n (S14).
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

      if (action === "status") return jsonResponse({ connection: await store.forUser(userId, "linkedin") });

      if (action === "disconnect") {
        const connection = await store.disconnect(userId, "linkedin");
        await safeMirror("social-connect-linkedin", () => mirrorDisconnect(store, userId, "linkedln_data"));
        return jsonResponse({ connection });
      }

      if (action === "exchange") {
        const code = parseAuthorizationCode(body.code);
        const redirectUri = parseRedirectUri(body.redirectUri, env);
        const now = clock();
        const tokens = await linkedinExchangeCode(env, fetcher, code, redirectUri, now);
        const person = await linkedinUserInfo(fetcher, tokens.accessToken);
        const credentials: CredentialInput[] = [
          { kind: "user_access", token: tokens.accessToken, expiresAt: tokens.accessExpiresAt.toISOString() },
          ...(tokens.refreshToken
            ? [{ kind: "refresh" as const, token: tokens.refreshToken, expiresAt: tokens.refreshExpiresAt?.toISOString() ?? null }]
            : []),
        ];
        const connection = await store.store({
          userId, network: "linkedin", accountId: person.id, accountName: person.name, scopes: tokens.scopes,
          accessExpiresAt: tokens.accessExpiresAt, refreshExpiresAt: tokens.refreshExpiresAt,
          dataAccessExpiresAt: null, credentials,
        });
        await safeMirror("social-connect-linkedin", () => mirrorLinkedInConnect(store, userId, {
          personId: person.id, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken,
          idToken: tokens.idToken, tokenExpiresAt: tokens.accessExpiresAt, scopes: tokens.scopes,
          userName: person.name, connectedAt: new Date(now),
        }));
        return jsonResponse({ connection });
      }

      // pages: refresh the publishable identities (the member and the organizations they administer).
      const current = await store.forUser(userId, "linkedin");
      if (!current || current.status === "disconnected" || !current.accountId) throw new SocialError("not_connected");
      const access = (await store.credentials(current.id)).find((c) => c.kind === "user_access");
      if (!access) throw new SocialError("not_connected");
      const pages = await linkedinAdminPages(fetcher, access.token, {
        id: current.accountId, name: current.accountName ?? "LinkedIn",
      });
      const connection = await store.setPages(userId, "linkedin", pages, null);
      await safeMirror("social-connect-linkedin", () => mirrorLinkedInPages(store, userId, pages));
      return jsonResponse({ connection });
    } catch (error) {
      logSocialError("social-connect-linkedin", error);
      const failure = socialFailure(error);
      return jsonResponse(failure.body, failure.status);
    }
  };
}

if (typeof Deno !== "undefined") Deno.serve(createHandler((name) => Deno.env.get(name)));
