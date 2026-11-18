// Resend email sent once when a publication target ends in needs_action or failed (S1, S10): which
// network, which publication, the reason in plain words and where to fix it. Spanish by default,
// English and Catalan by userData.language (same rule and sender as the connection notices).
import { type Fetcher, socialFetch } from "./social-http.ts";
import { appBaseUrl, noticeLanguage } from "./social-notice.ts";
import type { Environment } from "./social-store.ts";

type Language = "es" | "en" | "ca";
type Status = "needs_action" | "failed";

/** What publication_target_claim_notice returns. */
export interface PublicationNoticeRecipient {
  email: string;
  firstName: string | null;
  language: string | null;
  network: string;
  status: Status;
  errorCode: string | null;
  previewId: number;
  title: string | null;
}

// Groups of error codes (docs/social-publishing.md, "Error codes of a target").
type Reason =
  | "connection" | "page" | "permission" | "restricted" | "images" | "text" | "unknown_outcome"
  | "network_busy" | "rejected" | "generic";

const REASON_BY_CODE: Record<string, Reason> = {
  token_invalid: "connection", not_connected: "connection", connection_expired: "connection",
  page_not_authorized: "page", invalid_account: "page",
  permission_missing: "permission", account_restricted: "restricted",
  no_images: "images", too_many_images: "images", media_needs_crop: "images", media_format: "images",
  media_rejected: "images", media_url_invalid: "images", media_too_large: "images", media_unreadable: "images",
  caption_too_long: "text", commentary_too_long: "text", too_many_hashtags: "text", too_many_mentions: "text",
  outcome_unknown: "unknown_outcome",
  rate_limited: "network_busy", processing: "network_busy", container_expired: "network_busy",
  provider_unavailable: "network_busy", provider_response_invalid: "network_busy", lease_expired: "network_busy",
  internal_error: "network_busy",
  invalid_request: "rejected", provider_rejected: "rejected", api_version_unsupported: "rejected",
};

export function reasonFor(errorCode: string | null | undefined): Reason {
  return errorCode && Object.hasOwn(REASON_BY_CODE, errorCode) ? REASON_BY_CODE[errorCode] : "generic";
}

interface Texts {
  networks: Record<string, string>;
  greeting: (name: string) => string;
  subject: Record<Status, (network: string) => string>;
  intro: Record<Status, (network: string, title: string | null) => string>;
  // [what happened, what to do]
  reasons: Record<Reason, readonly [string, string]>;
  cta: string;
  footer: string;
}

const texts: Record<Language, Texts> = {
  es: {
    networks: { linkedin: "LinkedIn", instagram: "Instagram" },
    greeting: (name) => `Hola ${name},`,
    subject: {
      needs_action: (n) => `Tu publicación en ${n} necesita tu atención`,
      failed: (n) => `No se ha podido publicar en ${n}`,
    },
    intro: {
      needs_action: (n, t) => `Tu publicación${t ? ` «${t}»` : ""} en ${n} está detenida y necesita que hagas algo.`,
      failed: (n, t) => `No hemos podido publicar${t ? ` «${t}»` : " tu publicación"} en ${n}.`,
    },
    reasons: {
      connection: ["La conexión con la red social ha caducado o ya no está disponible.", "Vuelve a conectar la cuenta en Ajustes y reintenta la publicación."],
      page: ["La cuenta seleccionada ya no está autorizada.", "Vuelve a conectar la red social en Ajustes, elige de nuevo la cuenta y reintenta."],
      permission: ["Falta un permiso necesario para publicar.", "Vuelve a conectar la cuenta en Ajustes aceptando todos los permisos y reintenta."],
      restricted: ["La red social no permite publicar con esta cuenta ahora mismo.", "Revisa el estado de la cuenta en la red social y reintenta cuando esté resuelto."],
      images: ["La red social no acepta alguna de las imágenes.", "Revisa y ajusta las imágenes en la configuración de publicación y reintenta."],
      text: ["El texto no cumple los límites de la red social.", "Acórtalo o revisa hashtags y menciones, y reintenta."],
      unknown_outcome: ["No hemos podido confirmar si la publicación llegó a publicarse.", "Comprueba en la red social que no se haya publicado antes de reintentar, para no duplicarla."],
      network_busy: ["La red social no ha respondido correctamente tras varios intentos.", "Reintenta la publicación en unos minutos."],
      rejected: ["La red social ha rechazado la publicación.", "Revisa el contenido y reintenta. Si se repite, contacta con soporte."],
      generic: ["No hemos podido completar la publicación.", "Reintenta desde Mocklab. Si se repite, contacta con soporte."],
    },
    cta: "Ver mi publicación",
    footer: "Cuando la publicación se resuelva no te avisaremos de nuevo por este motivo.",
  },
  en: {
    networks: { linkedin: "LinkedIn", instagram: "Instagram" },
    greeting: (name) => `Hi ${name},`,
    subject: {
      needs_action: (n) => `Your ${n} post needs your attention`,
      failed: (n) => `Your post could not be published on ${n}`,
    },
    intro: {
      needs_action: (n, t) => `Your${t ? ` «${t}»` : ""} ${n} post is on hold and needs you to do something.`,
      failed: (n, t) => `We could not publish${t ? ` «${t}»` : " your post"} on ${n}.`,
    },
    reasons: {
      connection: ["The connection to the social network has expired or is no longer available.", "Reconnect the account in Settings and retry the post."],
      page: ["The selected account is no longer authorized.", "Reconnect the network in Settings, choose the account again and retry."],
      permission: ["A permission required to publish is missing.", "Reconnect the account in Settings, accept all permissions and retry."],
      restricted: ["The network does not allow publishing with this account right now.", "Check the account status on the network and retry once it is sorted."],
      images: ["The network does not accept one of the images.", "Review and adjust the images in the publish settings and retry."],
      text: ["The text does not meet the network's limits.", "Shorten it or review hashtags and mentions, then retry."],
      unknown_outcome: ["We could not confirm whether the post was published.", "Check on the network that it was not published before retrying, to avoid a duplicate."],
      network_busy: ["The network did not answer correctly after several attempts.", "Retry the post in a few minutes."],
      rejected: ["The network rejected the post.", "Review the content and retry. If it happens again, contact support."],
      generic: ["We could not complete the post.", "Retry from Mocklab. If it happens again, contact support."],
    },
    cta: "View my post",
    footer: "Once the post is resolved we will not email you again about this.",
  },
  ca: {
    networks: { linkedin: "LinkedIn", instagram: "Instagram" },
    greeting: (name) => `Hola ${name},`,
    subject: {
      needs_action: (n) => `La teva publicació a ${n} necessita la teva atenció`,
      failed: (n) => `No s'ha pogut publicar a ${n}`,
    },
    intro: {
      needs_action: (n, t) => `La teva publicació${t ? ` «${t}»` : ""} a ${n} està aturada i necessita que facis alguna cosa.`,
      failed: (n, t) => `No hem pogut publicar${t ? ` «${t}»` : " la teva publicació"} a ${n}.`,
    },
    reasons: {
      connection: ["La connexió amb la xarxa social ha caducat o ja no està disponible.", "Torna a connectar el compte a Configuració i reintenta la publicació."],
      page: ["El compte seleccionat ja no està autoritzat.", "Torna a connectar la xarxa social a Configuració, tria de nou el compte i reintenta."],
      permission: ["Falta un permís necessari per publicar.", "Torna a connectar el compte a Configuració acceptant tots els permisos i reintenta."],
      restricted: ["La xarxa social no permet publicar amb aquest compte ara mateix.", "Revisa l'estat del compte a la xarxa social i reintenta quan estigui resolt."],
      images: ["La xarxa social no accepta alguna de les imatges.", "Revisa i ajusta les imatges a la configuració de publicació i reintenta."],
      text: ["El text no compleix els límits de la xarxa social.", "Escurça'l o revisa hashtags i mencions, i reintenta."],
      unknown_outcome: ["No hem pogut confirmar si la publicació s'ha arribat a publicar.", "Comprova a la xarxa social que no s'hagi publicat abans de reintentar, per no duplicar-la."],
      network_busy: ["La xarxa social no ha respost correctament després de diversos intents.", "Reintenta la publicació d'aquí a uns minuts."],
      rejected: ["La xarxa social ha rebutjat la publicació.", "Revisa el contingut i reintenta. Si es repeteix, contacta amb suport."],
      generic: ["No hem pogut completar la publicació.", "Reintenta des de Mocklab. Si es repeteix, contacta amb suport."],
    },
    cta: "Veure la meva publicació",
    footer: "Quan la publicació es resolgui no t'avisarem de nou per aquest motiu.",
  },
};

const escapeHtml = (value: string) =>
  value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");

// A title is user content: single line, bounded, then escaped where it is rendered.
const cleanTitle = (title: string | null) => {
  const text = (title ?? "").replace(/\s+/gu, " ").trim();
  return text ? (text.length > 120 ? `${text.slice(0, 119)}…` : text) : null;
};

export function buildPublicationNotice(recipient: PublicationNoticeRecipient, baseUrl: string) {
  const t = texts[noticeLanguage(recipient.language)];
  const status: Status = recipient.status === "failed" ? "failed" : "needs_action";
  const network = t.networks[recipient.network] ?? recipient.network;
  const title = cleanTitle(recipient.title);
  const [what, todo] = t.reasons[reasonFor(recipient.errorCode)];
  const subject = t.subject[status](network);
  const name = escapeHtml(recipient.firstName?.trim() || "");
  const link = `${baseUrl}/preview-projects`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #007bff;">${escapeHtml(subject)}</h1>
      <p>${t.greeting(name || "Mocklab")}</p>
      <p>${escapeHtml(t.intro[status](network, title))}</p>
      <p>${escapeHtml(what)}</p>
      <p><strong>${escapeHtml(todo)}</strong></p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${escapeHtml(link)}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          ${escapeHtml(t.cta)}
        </a>
      </div>
      <p style="color: #666; font-size: 13px;">${escapeHtml(t.footer)}</p>
    </div>
  `;
  return { to: recipient.email, subject, html };
}

// Failures are logged (status only) and returned as false; they never throw.
export async function sendPublicationNotice(
  env: Environment, fetcher: Fetcher, recipient: PublicationNoticeRecipient,
): Promise<boolean> {
  const apiKey = env("RESEND_API_KEY")?.trim();
  if (!apiKey) {
    console.error("[social-publication-notice] RESEND_API_KEY is not configured");
    return false;
  }
  try {
    const notice = buildPublicationNotice(recipient, appBaseUrl(env));
    const response = await socialFetch(fetcher, "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Mocklab <noreply@mocklab.app>", to: [notice.to], subject: notice.subject, html: notice.html }),
    });
    await response.body?.cancel();
    if (!response.ok) console.error(`[social-publication-notice] Resend answered ${response.status}`);
    return response.ok;
  } catch (error) {
    console.error(`[social-publication-notice] email not sent (${error instanceof Error ? error.name : "error"})`);
    return false;
  }
}
