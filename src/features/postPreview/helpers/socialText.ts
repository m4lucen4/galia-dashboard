// Client mirror of supabase/functions/_shared/social-text.ts (S7, S20).
// The preview must show what is published, so the sanitizer and the counters are the same.
// Regular expressions avoid lookbehind (not supported by Safari < 16.4, where a literal with
// lookbehind breaks the whole bundle).

// PROVISIONAL Instagram limits (to confirm in phase 4).
export const INSTAGRAM_CAPTION_MAX = 2200;
export const INSTAGRAM_MAX_HASHTAGS = 30;
export const INSTAGRAM_MAX_MENTIONS = 20;

// LinkedIn Posts API commentary limit.
export const LINKEDIN_COMMENTARY_MAX = 3000;

// Facebook Page post message limit (Graph API).
export const FACEBOOK_MESSAGE_MAX = 63206;

const INVISIBLE = /[\u00ad\u180e\u200b\u200c\u200e\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\ufeff]/g;
// eslint-disable-next-line no-control-regex
const CONTROLS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

const PICTOGRAPHIC = /^\p{Extended_Pictographic}$/u;
const JOINABLE_BEFORE = /^(?:\p{Extended_Pictographic}|\ufe0f|\p{Emoji_Modifier}|[\u{E0020}-\u{E007F}])$/u;

// Keeps U+200D only when it sits between an emoji and a pictograph; drops it anywhere else.
function stripStrayJoiners(text: string): string {
  if (!text.includes("\u200d")) return text;
  const chars = Array.from(text);
  let out = "";
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (ch !== "\u200d") {
      out += ch;
      continue;
    }
    const prev = i > 0 ? chars[i - 1] : "";
    const next = i + 1 < chars.length ? chars[i + 1] : "";
    if (JOINABLE_BEFORE.test(prev) && PICTOGRAPHIC.test(next)) out += ch;
  }
  return out;
}

/**
 * Canonical text of a publication, whatever the network: NFC, real line breaks, no zero-width or
 * bidi control characters (ZWJ kept inside emoji), no control characters, trailing spaces trimmed,
 * at most one blank line between paragraphs. Literal "\n" are turned into line breaks only when
 * the text has no real line break at all (legacy n8n corruption).
 */
export function normalizeText(text: string | null | undefined): string {
  if (text === null || text === undefined) return "";
  let out = String(text).normalize("NFC");
  out = out.replace(/\r\n|\r|\u2028|\u2029/g, "\n");
  if (!out.includes("\n") && out.includes("\\")) out = out.replace(/\\r\\n|\\n/g, "\n");
  out = out.replace(INVISIBLE, "");
  out = stripStrayJoiners(out);
  out = out.replace(/\t/g, " ").replace(CONTROLS, "");
  out = out.replace(/[ ]+$/gm, "");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

export function characterCount(text: string): number {
  return Array.from(text).length;
}

// '#' followed by letters, digits or underscore, not glued to a previous word character.
const HASHTAG = /(^|[^\p{L}\p{N}_&#])#[\p{L}\p{N}_]+/gu;
// '@' followed by a username, not glued to a previous word character (emails are not mentions).
const MENTION = /(^|[^\p{L}\p{N}_.@])@[A-Za-z0-9._]+/gu;

export function countHashtags(text: string): number {
  return (text.match(HASHTAG) ?? []).length;
}

export function countMentions(text: string): number {
  return (text.match(MENTION) ?? []).length;
}

export interface PublicationTextRow {
  versions?: Array<{ main?: boolean; description?: string }> | null;
  description_rich?: string | null;
}

/**
 * The text that gets published: the description of the version marked main, else
 * description_rich. Raw text: use publishedText for what the previews and counters show.
 */
export function publicationText(row: PublicationTextRow | null | undefined): string {
  if (!row) return "";
  let text: string | null = null;
  if (Array.isArray(row.versions)) {
    for (const version of row.versions) {
      if (version && version.main === true) {
        if (typeof version.description === "string") text = version.description;
        break;
      }
    }
  }
  if (text === null) text = typeof row.description_rich === "string" ? row.description_rich : null;
  return text ?? "";
}

/** publicationText after the shared sanitizer: exactly the text both networks receive. */
export function publishedText(row: PublicationTextRow | null | undefined): string {
  return normalizeText(publicationText(row));
}

export interface TextStats {
  characters: number;
  hashtags: number;
  mentions: number;
}

export function textStats(text: string): TextStats {
  return {
    characters: characterCount(text),
    hashtags: countHashtags(text),
    mentions: countMentions(text),
  };
}
