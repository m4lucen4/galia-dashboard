import { FACEBOOK_PUBLISH_SCOPE } from "../../../redux/actions/SocialNetworksActions";
import {
  FacebookData,
  InstagramData,
  SocialConnectionStatus,
} from "../../../types";

const MADRID_DATE_FORMAT = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// dd/mm/yyyy in Europe/Madrid, or "" when the value is missing or invalid.
export const formatMadridDate = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : MADRID_DATE_FORMAT.format(date);
};

// Statuses where the user has to reconnect (or soon will).
export const needsReconnect = (status?: SocialConnectionStatus): boolean =>
  status === "expiring" ||
  status === "expired" ||
  status === "revoked" ||
  status === "error";

// Statuses where the connection cannot publish anymore.
export const isBrokenConnection = (status?: SocialConnectionStatus): boolean =>
  status === "expired" || status === "revoked" || status === "error";

// status_reason is a server slug ([a-z_]); unknown slugs fall back to a generic text in i18n.
export const reasonTranslationKey = (reason?: string | null): string =>
  reason && /^[a-z_]{1,60}$/.test(reason)
    ? `socialConnections.reasons.${reason}`
    : "socialConnections.reasons.unknown";

// Instagram is connected but the Facebook Pages are not usable yet (missing,
// disconnected, or the connection predates the pages_manage_posts scope).
export const needsFacebookReconnect = (
  instagram: InstagramData,
  facebook: FacebookData
): boolean =>
  instagram.isConnected &&
  (!facebook.isConnected ||
    !(facebook.scopes ?? []).includes(FACEBOOK_PUBLISH_SCOPE));
