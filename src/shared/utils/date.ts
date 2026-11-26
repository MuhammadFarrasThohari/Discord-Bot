export const VALID_DAY_CODES = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

export type DayCode = (typeof VALID_DAY_CODES)[number];

export const DAY_CODE_TO_NUMBER: Record<DayCode, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export const DAY_NUMBER_TO_LABEL = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

const JAKARTA_TIMEZONE = "Asia/Jakarta";
const JAKARTA_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAY_SHORT_TO_NUMBER: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Returns the day-of-week index (0 = Sunday .. 6 = Saturday) in `Asia/Jakarta`
 * regardless of the host machine's local timezone.
 */
export function getJakartaDayOfWeek(date: Date = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIMEZONE,
    weekday: "short",
  }).format(date);

  const day = WEEKDAY_SHORT_TO_NUMBER[weekday];

  if (day === undefined) {
    throw new Error(`Invalid Jakarta weekday: ${weekday}`);
  }

  return day;
}

/**
 * Computes the UTC `[startOfDay, endOfDay)` boundaries for the current calendar
 * day in `Asia/Jakarta` (UTC+7) so daily delivery queries match WIB midnight.
 */
export function getJakartaDateRange(date: Date = new Date()): {
  startOfDay: Date;
  endOfDay: Date;
} {
  // Shift the instant by +7h so UTC getters yield the Jakarta calendar date.
  const jakartaShifted = new Date(date.getTime() + JAKARTA_UTC_OFFSET_MS);

  // Convert 00:00:00 of that Jakarta calendar date back to UTC.
  const startOfDay = new Date(
    Date.UTC(
      jakartaShifted.getUTCFullYear(),
      jakartaShifted.getUTCMonth(),
      jakartaShifted.getUTCDate(),
    ) - JAKARTA_UTC_OFFSET_MS,
  );

  const endOfDay = new Date(startOfDay.getTime() + DAY_MS);

  return { startOfDay, endOfDay };
}
