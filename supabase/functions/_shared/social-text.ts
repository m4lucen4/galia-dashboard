// Shared text preparation for social publishing (S7, S20).
//
// One sanitizer (normalizeText) for every network, then per-network escaping/limits.
// Pure TypeScript: no Deno or Node APIs, so it can run in Edge Functions, Node and the tests.
//
// Quotes are never touched here: publishers send the text through JSON.stringify / URLSearchParams,
// which is what removes the '""' and stray backslash problems of the n8n expressions.

// PROVISIONAL Instagram limits (from public product behaviour, not from the Graph API reference).
// Confirm against the official documentation and a real container in phase 4 before enforcing them.
export const INSTAGRAM_CAPTION_MAX = 2200;
export const INSTAGRAM_MAX_HASHTAGS = 30;
export const INSTAGRAM_MAX_MENTIONS = 20;

// LinkedIn Posts API commentary limit.
export const LINKEDIN_COMMENTARY_MAX = 3000;

export type TextIssueCode = "too_long" | "too_many_hashtags" | "too_many_mentions";

export interface TextIssue {
  code: TextIssueCode;
  limit: number;
  actual: number;
}

// Zero-width and bidirectional control characters. U+200D (ZWJ) is handled separately because it
// glues emoji sequences together (family, flags with gender, professions...).
//   200B ZWSP, 200C ZWNJ, 200E/200F LRM/RLM, 202A-202E bidi embeddings/overrides,
//   2060-2064 word joiner and invisible operators, 2066-206F bidi isolates and deprecated format
//   characters, FEFF BOM/ZWNBSP, 180E Mongolian vowel separator, 00AD soft hyphen.
const INVISIBLE = /[\u00ad\u180e\u200b\u200c\u200e\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\ufeff]/g;
// C0 controls except \t (09) and \n (0A), plus DEL and the C1 range.
const CONTROLS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

const PICTOGRAPHIC = /^\p{Extended_Pictographic}$/u;
// What may precede a joiner inside an emoji sequence: a pictograph, a variation selector,
// a skin-tone modifier or a tag character (subdivision flags).
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
 * Canonical text of a publication, whatever the network:
 *  - Unicode NFC
 *  - \r\n, \r, U+2028 and U+2029 become \n
 *  - legacy n8n corruption: when the text has no real newline at all, literal "\n" (backslash,
 *    n; also "\r\n") become real newlines. Text that already has a real newline is left alone,
 *    so a deliberate "\n" inside a multi-line text survives.
 *  - zero-width and bidi control characters removed, except ZWJ inside emoji sequences
 *  - other control characters removed; tabs become a space
 *  - trailing spaces trimmed per line, 3+ consecutive newlines collapsed to 2 (one blank line),
 *    result trimmed
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

/**
 * LinkedIn "little text" commentary. The Posts API parses commentary as little text, where these
 * characters are reserved: | { } @ [ ] ( ) < > # \ * _ ~
 * Every one is escaped with a backslash, so the post shows the text literally. Consequence
 * (accepted, documented): hashtags and @mentions typed by the user are published as plain text,
 * not as clickable hashtags/mentions, because those need the structured syntax.
 */
export function linkedinCommentary(text: string | null | undefined): string {
  return normalizeText(text).replace(/[|{}@[\]()<>#\\*_~]/g, "\\$&");
}

/** Instagram caption: plain text, only normalised (no escaping exists on that API). */
export function instagramCaption(text: string | null | undefined): string {
  return normalizeText(text);
}

function characterCount(text: string): number {
  return Array.from(text).length;
}

// '#' followed by letters, digits or underscore, not glued to a previous word character.
const HASHTAG = /(?<![\p{L}\p{N}_&#])#[\p{L}\p{N}_]+/gu;
// '@' followed by a username (letters, digits, dots, underscores), not glued to a word/email.
const MENTION = /(?<![\p{L}\p{N}_.@])@[A-Za-z0-9._]+/gu;

export function countHashtags(text: string): number {
  return (text.match(HASHTAG) ?? []).length;
}

export function countMentions(text: string): number {
  return (text.match(MENTION) ?? []).length;
}

/** Instagram caption issues against the provisional limits (see constants above). */
export function validateInstagramCaption(text: string | null | undefined): TextIssue[] {
  const caption = instagramCaption(text);
  const issues: TextIssue[] = [];
  const length = characterCount(caption);
  if (length > INSTAGRAM_CAPTION_MAX) issues.push({ code: "too_long", limit: INSTAGRAM_CAPTION_MAX, actual: length });
  const hashtags = countHashtags(caption);
  if (hashtags > INSTAGRAM_MAX_HASHTAGS) {
    issues.push({ code: "too_many_hashtags", limit: INSTAGRAM_MAX_HASHTAGS, actual: hashtags });
  }
  const mentions = countMentions(caption);
  if (mentions > INSTAGRAM_MAX_MENTIONS) {
    issues.push({ code: "too_many_mentions", limit: INSTAGRAM_MAX_MENTIONS, actual: mentions });
  }
  return issues;
}

/**
 * LinkedIn commentary issues. The length is measured on the normalised text (what the user
 * wrote); whether the API counts the escaping backslashes is to be confirmed in phase 4.
 */
export function validateLinkedinCommentary(text: string | null | undefined): TextIssue[] {
  const length = characterCount(normalizeText(text));
  return length > LINKEDIN_COMMENTARY_MAX
    ? [{ code: "too_long", limit: LINKEDIN_COMMENTARY_MAX, actual: length }]
    : [];
}

export interface PublicationTextRow {
  versions?: unknown;
  description_rich?: string | null;
}

/**
 * The text that gets published: the description of the version marked main (main === true),
 * else description_rich. Same rule as the SQL function publication_target_payload and as n8n.
 * Returns the raw text (call normalizeText / linkedinCommentary / instagramCaption on it);
 * '' when the publication has no text.
 */
export function publicationText(row: PublicationTextRow | null | undefined): string {
  if (!row) return "";
  let text: string | null = null;
  if (Array.isArray(row.versions)) {
    for (const version of row.versions) {
      if (version && typeof version === "object" && (version as { main?: unknown }).main === true) {
        const description = (version as { description?: unknown }).description;
        if (typeof description === "string") text = description;
        break;
      }
    }
  }
  if (text === null) text = typeof row.description_rich === "string" ? row.description_rich : null;
  return text ?? "";
}
