import { workerAuthorized } from "../_shared/publication-generation-store.ts";
import { corsHeaders, jsonResponse, logSocialError, SocialError, socialFailure } from "../_shared/social-errors.ts";
import { instagramDebugToken, PUBLISH_SCOPE, type TokenDebug } from "../_shared/social-instagram.ts";
import { linkedinRefresh, type LinkedInTokens } from "../_shared/social-linkedin.ts";
import { safeMirror, syncLinkedInMirror } from "../_shared/social-n8n-mirror.ts";
import { sendNotice } from "../_shared/social-notice.ts";
import {
  type ConnectionSummary, createSocialStore, type CredentialInput, type Environment, type ReportInput,
  type SocialStore,
} from "../_shared/social-store.ts";

const SCOPE = "social-credentials-check";
const REFRESH_WINDOW_MS = 7 * 24 * 3600 * 1000;
const BATCH_SIZE = 50;
const MAX_BATCHES = 10;
// Edge Functions have a wall-clock limit: stop early; unchecked connections stay due for the next run.
const DEADLINE_MS = 110_000;
const MAX_PAGE_TOKENS_CHECKED = 25;

interface Decision {
  report: ReportInput;
  refreshed?: LinkedInTokens;
}

interface Context {
  env: Environment;
  fetcher: typeof fetch;
  store: SocialStore;
  now: number;
}

const NO_CHANGE: ReportInput = { status: null, reason: null };
const ms = (value: string | null | undefined) => {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isNaN(parsed) ? null : parsed;
};

// null = leave the connection untouched (network trouble, 5xx): the next run retries it.
// A report with status null only recomputes the status from the stored dates.
async function decideLinkedIn(connection: ConnectionSummary, ctx: Context): Promise<Decision | null> {
  const credentials = await ctx.store.credentials(connection.id);
  const access = credentials.find((c) => c.kind === "user_access");
  const refresh = credentials.find((c) => c.kind === "refresh");
  const accessExpires = ms(connection.accessExpiresAt ?? access?.expiresAt);
  const refreshExpires = ms(connection.refreshExpiresAt ?? refresh?.expiresAt);
  const refreshable = refresh && accessExpires !== null && accessExpires - ctx.now <= REFRESH_WINDOW_MS &&
    !(refreshExpires !== null && refreshExpires <= ctx.now);
  if (!refresh || !refreshable) return { report: NO_CHANGE };

  let tokens: LinkedInTokens;
  try {
    tokens = await linkedinRefresh(ctx.env, ctx.fetcher, refresh.token, ctx.now);
  } catch (error) {
    const code = error instanceof SocialError ? error.code : null;
    if (code === "token_invalid") return { report: { status: "revoked", reason: "token_invalid" } };
    if (code === "provider_rejected") return { report: NO_CHANGE };
    throw error;
  }
  const rotated: CredentialInput[] = [
    { kind: "user_access", token: tokens.accessToken, expiresAt: tokens.accessExpiresAt.toISOString() },
    ...(tokens.refreshToken
      ? [{
        kind: "refresh" as const, token: tokens.refreshToken,
        expiresAt: tokens.refreshExpiresAt?.toISOString() ?? refresh.expiresAt,
      }]
      : []),
  ];
  return {
    report: {
      status: null, reason: null, accessExpiresAt: tokens.accessExpiresAt, refreshExpiresAt: tokens.refreshExpiresAt,
      credentials: rotated, refreshed: true,
    },
    refreshed: tokens,
  };
}

// Instagram health is decided from the page tokens, the ones that publish. An invalid or expired user
// token alone is not a revocation: page tokens are long-lived and outlive it, so the dates decide
// (expiring / expired) through data_access_expires_at.
//   revoked token_invalid     every page token is invalid (or no page tokens and the user token is invalid)
//   revoked permission_missing no valid page token carries instagram_content_publish (a page token that
//                              reports no scopes at all is not judged; with no page tokens, the user token)
//   otherwise                  status null: dates drive the status
async function decideInstagram(connection: ConnectionSummary, ctx: Context): Promise<Decision | null> {
  const credentials = await ctx.store.credentials(connection.id);
  const user = credentials.find((c) => c.kind === "user_access");
  if (!user) return { report: NO_CHANGE };
  try {
    const userDebug = await instagramDebugToken(ctx.env, ctx.fetcher, user.token);
    const pageTokens = credentials.filter((c) => c.kind === "page_access").slice(0, MAX_PAGE_TOKENS_CHECKED);
    const pageDebugs: TokenDebug[] = [];
    for (const page of pageTokens) pageDebugs.push(await instagramDebugToken(ctx.env, ctx.fetcher, page.token));
    const validPages = pageDebugs.filter((d) => d.isValid);

    if (pageTokens.length === 0) {
      if (!userDebug.isValid) return { report: { status: "revoked", reason: "token_invalid" } };
      if (!userDebug.scopes.includes(PUBLISH_SCOPE)) return { report: { status: "revoked", reason: "permission_missing" } };
    } else {
      if (validPages.length === 0) return { report: { status: "revoked", reason: "token_invalid" } };
      if (validPages.every((d) => d.scopes.length > 0 && !d.scopes.includes(PUBLISH_SCOPE))) {
        return { report: { status: "revoked", reason: "permission_missing" } };
      }
    }
    const dated = [...(userDebug.isValid ? [userDebug] : []), ...validPages];
    return {
      report: {
        status: null, reason: null,
        accessExpiresAt: userDebug.isValid ? userDebug.expiresAt : null,
        dataAccessExpiresAt: dated.find((d) => d.dataAccessExpiresAt)?.dataAccessExpiresAt ?? null,
      },
    };
  } catch (error) {
    if (error instanceof SocialError && error.code === "provider_rejected") return { report: NO_CHANGE };
    throw error;
  }
}

// Daily worker (cron + worker secret, no user session): refreshes LinkedIn tokens that expire within
// 7 days, validates Instagram tokens with debug_token, reports the health to social_connections and
// emails the user once per bad status (Resend).
export function createHandler(env: Environment, fetcher: typeof fetch = fetch, clock: () => number = Date.now) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (request.method !== "POST") return jsonResponse(socialFailure(new SocialError("invalid_request")).body, 405);
    try {
      const workerSecret = env("SOCIAL_WORKER_SECRET");
      if (!workerSecret || !await workerAuthorized(request.headers.get("X-Social-Worker-Secret"), workerSecret)) {
        throw new SocialError("unauthorized");
      }
      const store = createSocialStore(env, fetcher);
      const started = clock();
      const summary = {
        checked: 0, refreshed: 0, revoked: 0, unchanged: 0, skipped: 0, failed: 0,
        mirrorRepairs: 0, mirrorUserDataMissing: 0,
        notices: 0, emailsSent: 0, emailsFailed: 0, noticesReleased: 0, deadlineReached: false,
      };
      const seen = new Set<string>();

      batches:
      for (let batch = 0; batch < MAX_BATCHES; batch++) {
        const due = (await store.dueCheck(BATCH_SIZE)).filter((c) => !seen.has(c.id));
        if (due.length === 0) break;
        for (const connection of due) {
          if (clock() - started > DEADLINE_MS) {
            summary.deadlineReached = true;
            break batches;
          }
          seen.add(connection.id);
          const ctx: Context = { env, fetcher, store, now: clock() };
          try {
            // A revoked connection is only listed to retry its email: there is nothing to check.
            if (connection.status !== "revoked") {
              const decision = connection.network === "linkedin"
                ? await decideLinkedIn(connection, ctx)
                : await decideInstagram(connection, ctx);
              if (!decision) {
                summary.skipped++;
                continue;
              }
              const reported = await store.report(connection.id, {
                ...decision.report, expectedConnectedAt: connection.connectedAt,
              });
              // Reconnected while this check ran: the database dropped the stale report, so the
              // refreshed token is stale too and must not reach the mirror.
              if (connection.connectedAt !== null && reported.connectedAt !== connection.connectedAt) {
                summary.skipped++;
                continue;
              }
              summary.checked++;
              if (decision.refreshed) summary.refreshed++;
              else if (decision.report.status) summary.revoked++;
              else summary.unchanged++;

              // Every LinkedIn check re-syncs the n8n mirror (not only right after a refresh), so a
              // failed mirror write is repaired on the next run.
              if (connection.network === "linkedin" && reported.status !== "disconnected") {
                const outcome = await safeMirror(SCOPE, async () => {
                  const stored = await store.credentials(connection.id);
                  const server = stored.find((c) => c.kind === "user_access");
                  if (!server) return "unchanged";
                  const rotated = stored.find((c) => c.kind === "refresh");
                  const expires = ms(server.expiresAt ?? reported.accessExpiresAt);
                  return syncLinkedInMirror(store, connection.userId, {
                    accessToken: server.token, tokenExpiresAt: expires === null ? null : new Date(expires),
                    refreshToken: rotated?.token ?? null,
                  });
                });
                if (outcome === "written" && !decision.refreshed) summary.mirrorRepairs++;
                if (outcome === "user_data_missing") summary.mirrorUserDataMissing++;
              }
            }

            const recipient = await store.claimNotice(connection.id);
            if (recipient) {
              summary.notices++;
              if (await sendNotice(env, fetcher, recipient, new Date(clock()))) summary.emailsSent++;
              else {
                summary.emailsFailed++;
                // Give the claim back so the next run retries the email.
                if (await store.releaseNotice(connection.id, recipient.connection.status)) summary.noticesReleased++;
              }
            }
          } catch (error) {
            // Transient provider trouble leaves the status alone; one bad connection never stops the run.
            if (error instanceof SocialError && error.code === "provider_unavailable") summary.skipped++;
            else summary.failed++;
            logSocialError(`${SCOPE}:${connection.network}`, error);
          }
        }
      }
      return jsonResponse(summary);
    } catch (error) {
      logSocialError(SCOPE, error);
      const failure = socialFailure(error);
      return jsonResponse(failure.body, failure.status);
    }
  };
}

if (typeof Deno !== "undefined") Deno.serve(createHandler((name) => Deno.env.get(name)));
