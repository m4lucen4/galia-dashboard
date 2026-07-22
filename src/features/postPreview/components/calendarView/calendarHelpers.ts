import { PreviewProjectDataProps } from "../../../../types";

export interface CalendarDayCell {
  date: Date;
  dayKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export const WEEKDAY_LABELS_ES = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
];

const MONTH_LABELS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const MONTH_SHORT_LABELS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

/** Formats a plain calendar Date as "22 de julio" (local components only). */
export const formatDayLabelEs = (date: Date): string =>
  `${date.getDate()} de ${MONTH_LABELS_ES[date.getMonth()]}`;

/** Formats a plain calendar Date as "Julio 2026" (local components only). */
export const formatMonthYearLabelEs = (date: Date): string =>
  `${capitalize(MONTH_LABELS_ES[date.getMonth()])} ${date.getFullYear()}`;

/** Formats a week's day cells as "20 – 26 jul 2026" (local components only). */
export const formatWeekRangeLabelEs = (weekDays: CalendarDayCell[]): string => {
  const start = weekDays[0].date;
  const end = weekDays[weekDays.length - 1].date;
  const startLabel = `${start.getDate()}`;
  const endLabel = `${end.getDate()} ${MONTH_SHORT_LABELS_ES[end.getMonth()]} ${end.getFullYear()}`;
  return `${startLabel} – ${endLabel}`;
};

const pad = (value: number): string => value.toString().padStart(2, "0");

/**
 * Builds a "YYYY-MM-DD" key from a plain calendar Date (local components).
 * Safe for grid-generation purposes only — never use to parse a stored
 * publishDate, since that must go through getDayKeyFromPublishDate below
 * to avoid timezone shifts.
 */
const toDayKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const PUBLISH_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/;

/**
 * Extracts the "YYYY-MM-DD" day key directly from a stored publishDate
 * (timestampz or ISO) via regex, mirroring formatDateTimeToDisplay in
 * src/helpers/index.ts. Deliberately avoids `new Date(...)` here so a post
 * stored near midnight UTC never shifts to the wrong day based on the
 * viewer's local timezone.
 */
export const getDayKeyFromPublishDate = (
  dateString: string | undefined,
): string | null => {
  if (!dateString) return null;
  const match = dateString.match(PUBLISH_DATE_REGEX);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${year}-${month}-${day}`;
};

/**
 * Extracts "HH:mm" from a stored publishDate, same regex-based approach.
 */
export const formatTimeOnly = (
  dateString: string | undefined,
): string | null => {
  if (!dateString) return null;
  const match = dateString.match(PUBLISH_DATE_REGEX);
  if (!match) return null;
  const [, , , , hours, minutes] = match;
  return `${hours}:${minutes}`;
};

export const getTodayDayKey = (): string => toDayKey(new Date());

/**
 * Groups projects by day key, excluding any project without a publishDate
 * (which naturally excludes "preview" state posts from the calendar).
 * Each day's projects are sorted by time of day ascending.
 */
export const groupProjectsByDay = (
  projects: PreviewProjectDataProps[],
): Map<string, PreviewProjectDataProps[]> => {
  const grouped = new Map<string, PreviewProjectDataProps[]>();

  projects.forEach((project) => {
    const dayKey = getDayKeyFromPublishDate(project.publishDate);
    if (!dayKey) return;

    const existing = grouped.get(dayKey) ?? [];
    existing.push(project);
    grouped.set(dayKey, existing);
  });

  grouped.forEach((dayProjects) => {
    dayProjects.sort((a, b) => {
      const timeA = formatTimeOnly(a.publishDate) ?? "";
      const timeB = formatTimeOnly(b.publishDate) ?? "";
      return timeA.localeCompare(timeB);
    });
  });

  return grouped;
};

const buildDayCell = (
  date: Date,
  currentMonth: number,
  todayKey: string,
): CalendarDayCell => {
  const dayKey = toDayKey(date);
  return {
    date,
    dayKey,
    isCurrentMonth: date.getMonth() === currentMonth,
    isToday: dayKey === todayKey,
  };
};

/**
 * Returns the month grid as weeks of 7 day cells (Monday-first), including
 * leading/trailing days from adjacent months so every week row is complete.
 */
export const buildMonthGrid = (referenceDate: Date): CalendarDayCell[][] => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const todayKey = getTodayDayKey();

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastOfMonth.getDate();

  // Monday-first offset: JS getDay() is 0=Sunday..6=Saturday.
  const leadingOffset = (firstOfMonth.getDay() + 6) % 7;
  const totalCells = Math.ceil((leadingOffset + daysInMonth) / 7) * 7;

  const gridStart = new Date(year, month, 1 - leadingOffset);

  const cells: CalendarDayCell[] = Array.from(
    { length: totalCells },
    (_, index) => {
      const date = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index,
      );
      return buildDayCell(date, month, todayKey);
    },
  );

  const weeks: CalendarDayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
};

/**
 * Returns the 7 day cells (Monday-first) of the week containing referenceDate.
 */
export const buildWeekGrid = (referenceDate: Date): CalendarDayCell[] => {
  const todayKey = getTodayDayKey();
  const mondayOffset = (referenceDate.getDay() + 6) % 7;
  const monday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - mondayOffset,
  );

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + index,
    );
    return buildDayCell(date, referenceDate.getMonth(), todayKey);
  });
};

export const addMonths = (date: Date, delta: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + delta, 1);

export const addWeeks = (date: Date, delta: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta * 7);
