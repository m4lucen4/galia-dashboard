// Publication dates (S9). The user picks and reads dates in Europe/Madrid; the server stores the real
// instant. Until the cutover n8n reads the old convention: Madrid wall-clock digits labelled "+00".
// This module owns the conversion between both worlds.

/**
 * Cutover switch (S23): every client path to the Supabase publishing pipeline (publish-publication,
 * publication_targets, Madrid instants) is gated by it. Off by default: the app behaves as with n8n.
 */
export const SOCIAL_PUBLISHING_EDGE_ENABLED =
  import.meta.env.VITE_SOCIAL_PUBLISHING_EDGE === "true";

export const PUBLISH_TIME_ZONE = "Europe/Madrid";

const MADRID_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: PUBLISH_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value: number): string => value.toString().padStart(2, "0");

/** Europe/Madrid offset (ms, DST included) at a real instant. */
export const madridOffsetMs = (instantMs: number): number => {
  const parts: Record<string, number> = {};
  for (const part of MADRID_PARTS.formatToParts(new Date(instantMs))) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - Math.floor(instantMs / 1000) * 1000;
};

/**
 * Real instant (ms) of a Madrid wall-clock time given as UTC-labelled components.
 * - Normal times: wall - offset.
 * - Autumn overlap (02:00-03:00 happens twice): the first occurrence (summer time) wins.
 * - Spring gap (02:00-03:00 does not exist): moves forward to the equivalent time after the gap.
 */
const wallClockMsToInstantMs = (wallMs: number): number => {
  // The only two offsets that can apply around that wall time are the ones a day before and after.
  const candidates = [
    wallMs - madridOffsetMs(wallMs - DAY_MS),
    wallMs - madridOffsetMs(wallMs + DAY_MS),
  ].filter((instant, index, all) => all.indexOf(instant) === index);
  const valid = candidates.filter(
    (instant) => instant + madridOffsetMs(instant) === wallMs,
  );
  if (valid.length > 0) return Math.min(...valid);
  // Gap: use the offset in force before the change.
  return wallMs - madridOffsetMs(wallMs - DAY_MS);
};

const ISO_LIKE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY = /^([01]\d|2[0-3]):[0-5]\d$/;

const validCalendarDate = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): boolean => {
  const check = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() === month - 1 &&
    check.getUTCDate() === day &&
    check.getUTCHours() === hour &&
    check.getUTCMinutes() === minute
  );
};

/**
 * Parses a stored instant ("2026-11-19T10:00:00+00:00", "2026-11-19 10:00:00+00", "…Z", with or without
 * fractions). A value without offset is read as UTC. Returns null when it is not a valid instant.
 * Done by hand because Safari rejects the space-separated Postgres format.
 */
export const parseInstant = (value?: string | null): Date | null => {
  const match = value?.trim().match(ISO_LIKE);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match
    .slice(1, 7)
    .map((part) => Number(part ?? 0));
  if (!validCalendarDate(year, month, day, hour, minute, second)) return null;
  let offsetMs = 0;
  const zone = match[7];
  if (zone && zone !== "Z") {
    const sign = zone.startsWith("-") ? -1 : 1;
    const digits = zone.slice(1).replace(":", "");
    const hours = Number(digits.slice(0, 2));
    const minutes = Number(digits.slice(2, 4) || 0);
    offsetMs = sign * (hours * 60 + minutes) * 60_000;
  }
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - offsetMs);
};

/**
 * Madrid wall-clock (date "YYYY-MM-DD", time "HH:mm") -> real instant as ISO string (UTC, "Z").
 * Returns null when the date or time is not valid.
 */
export const madridWallClockToIso = (date: string, time: string): string | null => {
  if (!DATE_ONLY.test(date) || !TIME_ONLY.test(time)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (!validCalendarDate(year, month, day, hour, minute, 0)) return null;
  const instant = wallClockMsToInstantMs(Date.UTC(year, month - 1, day, hour, minute, 0));
  return new Date(instant).toISOString();
};

/**
 * Reads digits as Madrid wall-clock (the legacy "YYYY-MM-DD HH:mm:ss+00" label, which the date input
 * also uses as its value) and returns the real instant.
 */
export const madridWallClockToInstant = (value?: string): Date | null => {
  const match = value
    ?.trim()
    .match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|\+00(?::?00)?)?$/,
    );
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match
    .slice(1)
    .map((part) => Number(part ?? 0));
  if (!validCalendarDate(year, month, day, hour, minute, second)) return null;
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  return new Date(wallClockMsToInstantMs(wall));
};

interface MadridFields {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

const madridFields = (date: Date): MadridFields => {
  const wall = new Date(date.getTime() + madridOffsetMs(date.getTime()));
  return {
    year: String(wall.getUTCFullYear()),
    month: pad(wall.getUTCMonth() + 1),
    day: pad(wall.getUTCDate()),
    hour: pad(wall.getUTCHours()),
    minute: pad(wall.getUTCMinutes()),
  };
};

/** "DD-MM-YYYY HH:mm" in Europe/Madrid, or "" when the value is not a valid instant. */
export const formatInstantInMadrid = (value?: string | Date | null): string => {
  const date = value instanceof Date ? value : parseInstant(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  const f = madridFields(date);
  return `${f.day}-${f.month}-${f.year} ${f.hour}:${f.minute}`;
};

/** "YYYY-MM-DD" day in Europe/Madrid, or null. */
export const madridDayKeyOf = (value?: string | Date | null): string | null => {
  const date = value instanceof Date ? value : parseInstant(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  const f = madridFields(date);
  return `${f.year}-${f.month}-${f.day}`;
};

/** "HH:mm" in Europe/Madrid, or null. */
export const madridTimeOf = (value?: string | Date | null): string | null => {
  const date = value instanceof Date ? value : parseInstant(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  const f = madridFields(date);
  return `${f.hour}:${f.minute}`;
};

/** Today's date ("YYYY-MM-DD") in Europe/Madrid. */
export const madridToday = (now: Date = new Date()): string =>
  madridDayKeyOf(now) as string;

/**
 * Real instant -> the Madrid wall-clock label the date input works with ("YYYY-MM-DD HH:mm:ss+00"),
 * or "" when the value is not a valid instant.
 */
export const instantToMadridWallClockLabel = (value?: string | null): string => {
  const date = parseInstant(value);
  if (!date) return "";
  const f = madridFields(date);
  return `${f.year}-${f.month}-${f.day} ${f.hour}:${f.minute}:00+00`;
};
