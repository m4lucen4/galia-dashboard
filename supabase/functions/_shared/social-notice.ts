// Resend email sent when a social connection becomes expiring / expired / revoked (S10, S6).
import { type Fetcher, socialFetch } from "./social-http.ts";
import type { Environment, NoticeRecipient } from "./social-store.ts";

type Language = "es" | "en" | "ca";

interface Texts {
  locale: string;
  networks: Record<string, string>;
  greeting: (name: string) => string;
  subject: Record<"expiring" | "expired" | "revoked", (network: string) => string>;
  body: Record<"expiring" | "expired" | "revoked", (network: string, date: string) => string>;
  reasons: Record<string, string>;
  consequence: string;
  cta: string;
  fallback: string;
}

const texts: Record<Language, Texts> = {
  es: {
    locale: "es-ES",
    networks: { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook" },
    greeting: (name) => `Hola ${name},`,
    subject: {
      expiring: (n) => `Tu conexión con ${n} caduca pronto`,
      expired: (n) => `Tu conexión con ${n} ha caducado`,
      revoked: (n) => `Reconecta tu cuenta de ${n}`,
    },
    body: {
      expiring: (n, d) => `Tu conexión con ${n} caducará el ${d}.`,
      expired: (n, d) => `Tu conexión con ${n} caducó el ${d}.`,
      revoked: (n) => `Tu conexión con ${n} ha dejado de funcionar.`,
    },
    reasons: {
      token_invalid: "La red social ya no acepta la conexión (se ha cerrado la sesión o se han revocado los accesos).",
      permission_missing: "Falta el permiso necesario para publicar.",
    },
    consequence: "Hasta que la reconectes no podremos publicar en esta red.",
    cta: "Reconectar mi cuenta",
    fallback: "Si ya lo has hecho, puedes ignorar este mensaje.",
  },
  en: {
    locale: "en-GB",
    networks: { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook" },
    greeting: (name) => `Hi ${name},`,
    subject: {
      expiring: (n) => `Your ${n} connection expires soon`,
      expired: (n) => `Your ${n} connection has expired`,
      revoked: (n) => `Reconnect your ${n} account`,
    },
    body: {
      expiring: (n, d) => `Your ${n} connection will expire on ${d}.`,
      expired: (n, d) => `Your ${n} connection expired on ${d}.`,
      revoked: (n) => `Your ${n} connection has stopped working.`,
    },
    reasons: {
      token_invalid: "The network no longer accepts the connection (you signed out or the access was revoked).",
      permission_missing: "The permission required to publish is missing.",
    },
    consequence: "Until you reconnect it we won't be able to publish to this network.",
    cta: "Reconnect my account",
    fallback: "If you have already done it, you can ignore this message.",
  },
  ca: {
    locale: "ca-ES",
    networks: { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook" },
    greeting: (name) => `Hola ${name},`,
    subject: {
      expiring: (n) => `La teva connexió amb ${n} caduca aviat`,
      expired: (n) => `La teva connexió amb ${n} ha caducat`,
      revoked: (n) => `Reconnecta el teu compte de ${n}`,
    },
    body: {
      expiring: (n, d) => `La teva connexió amb ${n} caducarà el ${d}.`,
      expired: (n, d) => `La teva connexió amb ${n} va caducar el ${d}.`,
      revoked: (n) => `La teva connexió amb ${n} ha deixat de funcionar.`,
    },
    reasons: {
      token_invalid: "La xarxa social ja no accepta la connexió (s'ha tancat la sessió o s'han revocat els accessos).",
      permission_missing: "Falta el permís necessari per publicar.",
    },
    consequence: "Fins que la reconnectis no podrem publicar en aquesta xarxa.",
    cta: "Reconnectar el meu compte",
    fallback: "Si ja ho has fet, pots ignorar aquest missatge.",
  },
};

// userData.language: 'en' / 'en-US' -> English, 'ca' / 'cat' -> Catalan, anything else -> Spanish.
export function noticeLanguage(language: string | null | undefined): Language {
  const value = (language ?? "").trim().toLowerCase();
  if (value.startsWith("en")) return "en";
  if (value.startsWith("ca")) return "ca";
  return "es";
}

const escapeHtml = (value: string) =>
  value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");

// Production dashboard (publications /preview-projects, settings /settings); APP_BASE_URL overrides it.
export function appBaseUrl(env: Environment): string {
  const fallback = "https://www.mocklab.app";
  const value = env("APP_BASE_URL")?.trim();
  if (!value) return fallback;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : fallback;
  } catch { return fallback; }
}

export function buildNotice(recipient: NoticeRecipient, baseUrl: string, now = new Date()) {
  const t = texts[noticeLanguage(recipient.language)];
  const { connection } = recipient;
  const kind = connection.status === "expiring" ? "expiring" : connection.status === "expired" ? "expired" : "revoked";
  const network = t.networks[connection.network] ?? connection.network;
  const expires = connection.expiresAt ? new Date(connection.expiresAt) : now;
  const date = new Intl.DateTimeFormat(t.locale, { dateStyle: "long", timeZone: "Europe/Madrid" })
    .format(Number.isNaN(expires.getTime()) ? now : expires);
  const reason = kind === "revoked" ? t.reasons[connection.statusReason ?? ""] : undefined;
  const link = `${baseUrl}/settings`;
  const name = escapeHtml(recipient.firstName?.trim() || "");
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #007bff;">${escapeHtml(t.subject[kind](network))}</h1>
      <p>${t.greeting(name || "Mocklab")}</p>
      <p>${escapeHtml(t.body[kind](network, date))}</p>
      ${reason ? `<p>${escapeHtml(reason)}</p>` : ""}
      <p>${escapeHtml(t.consequence)}</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${escapeHtml(link)}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          ${escapeHtml(t.cta)}
        </a>
      </div>
      <p style="color: #666; font-size: 13px;">${escapeHtml(t.fallback)}</p>
    </div>
  `;
  return { to: recipient.email, subject: t.subject[kind](network), html };
}

// Failures are logged (status only) and returned as false; they never throw.
export async function sendNotice(
  env: Environment, fetcher: Fetcher, recipient: NoticeRecipient, now = new Date(),
): Promise<boolean> {
  const apiKey = env("RESEND_API_KEY")?.trim();
  if (!apiKey) {
    console.error("[social-notice] RESEND_API_KEY is not configured");
    return false;
  }
  try {
    const notice = buildNotice(recipient, appBaseUrl(env), now);
    const response = await socialFetch(fetcher, "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Mocklab <noreply@mocklab.app>", to: [notice.to], subject: notice.subject, html: notice.html }),
    });
    if (!response.ok) console.error(`[social-notice] Resend answered ${response.status}`);
    return response.ok;
  } catch (error) {
    console.error(`[social-notice] email not sent (${error instanceof Error ? error.name : "error"})`);
    return false;
  }
}
