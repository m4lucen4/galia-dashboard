import { workerAuthorized } from "../_shared/publication-generation-store.ts";
import { corsHeaders, jsonResponse, logSocialError, SocialError, socialFailure } from "../_shared/social-errors.ts";
import { instagramDebugToken, PUBLISH_SCOPE } from "../_shared/social-instagram.ts";
import { linkedinRefresh, type LinkedInTokens } from "../_shared/social-linkedin.ts";
import { mirrorLinkedInRefresh, safeMirror } from "../_shared/social-n8n-mirror.ts";
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
  const credentials2: CredentialInput[] = [
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
      credentials: credentials2, refreshed: true,
    },
    refreshed: tokens,
  };
}

async function decideInstagram(connection: ConnectionSummary, ctx: Context): Promise<Decision | null> {
  const credentials = await ctx.store.credentials(connection.id);
  const user = credentials.find((c) => c.kind === "user_access");
  if (!user) return { report: NO_CHANGE };
  try {
    const debug = await instagramDebugToken(ctx.env, ctx.fetcher, user.token);
    if (!debug.isValid) return { report: { status: "revoked", reason: "token_invalid" } };
    if (!debug.scopes.includes(PUBLISH_SCOPE)) return { report: { status: "revoked", reason: "permission_missing" } };
    for (const page of credentials.filter((c) => c.kind === "page_access").slice(0, MAX_PAGE_TOKENS_CHECKED)) {
      if (!(await instagramDebugToken(ctx.env, ctx.fetcher, page.token)).isValid) {
        return { report: { status: "revoked", reason: "token_invalid" } };
      }
    }
    return {
      report: {
        status: null, reason: null, accessExpiresAt: debug.expiresAt, dataAccessExpiresAt: debug.dataAccessExpiresAt,
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
        notices: 0, emailsSent: 0, emailsFailed: 0, deadlineReached: false,
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
            const decision = connection.network === "linkedin"
              ? await decideLinkedIn(connection, ctx)
              : await decideInstagram(connection, ctx);
            if (!decision) {
              summary.skipped++;
              continue;
            }
            await store.report(connection.id, decision.report);
            summary.checked++;
            if (decision.refreshed) {
              summary.refreshed++;
              const tokens = decision.refreshed;
              await safeMirror(SCOPE, () => mirrorLinkedInRefresh(store, connection.userId, {
                accessToken: tokens.accessToken, tokenExpiresAt: tokens.accessExpiresAt, refreshToken: tokens.refreshToken,
              }));
            } else if (decision.report.status) summary.revoked++;
            else summary.unchanged++;

            const recipient = await store.claimNotice(connection.id);
            if (recipient) {
              summary.notices++;
              if (await sendNotice(env, fetcher, recipient, new Date(clock()))) summary.emailsSent++;
              else summary.emailsFailed++;
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
