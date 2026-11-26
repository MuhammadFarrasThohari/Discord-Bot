import { describe, expect, it } from "vitest";

import {
  formatWeekdayNumbers,
  getEarliestWeekdaySortKey,
  getJakartaDateRange,
  getJakartaDayOfWeek,
  sortWeekdayNumbers,
} from "../shared/utils/date";

describe("date utilities (Asia/Jakarta)", () => {
  it("resolves weekday in Jakarta timezone even across UTC midnight", () => {
    // 2026-11-25 17:30:00 UTC is 2026-11-26 00:30:00 WIB (Thursday = 4).
    const utcWednesdayEvening = new Date("2026-11-25T17:30:00.000Z");
    expect(getJakartaDayOfWeek(utcWednesdayEvening)).toBe(4);

    // 2026-11-25 16:30:00 UTC is 2026-11-25 23:30:00 WIB (Wednesday = 3).
    const utcWednesdayAfternoon = new Date("2026-11-25T16:30:00.000Z");
    expect(getJakartaDayOfWeek(utcWednesdayAfternoon)).toBe(3);
  });

  it("computes UTC boundaries matching Jakarta midnight-to-midnight", () => {
    const instantInWibNov26 = new Date("2026-11-25T17:30:00.000Z");
    const { startOfDay, endOfDay } = getJakartaDateRange(instantInWibNov26);

    expect(startOfDay.toISOString()).toBe("2026-11-25T17:00:00.000Z");
    expect(endOfDay.toISOString()).toBe("2026-11-26T17:00:00.000Z");
  });

  it("sorts and formats weekdays in Monday-to-Sunday order", () => {
    expect(sortWeekdayNumbers([0, 5, 1, 5, 3])).toEqual([1, 3, 5, 0]);
    expect(formatWeekdayNumbers([0, 5, 1])).toBe("Mon, Fri, Sun");
    expect(getEarliestWeekdaySortKey([0, 5])).toBe(4);
    expect(getEarliestWeekdaySortKey([])).toBe(Number.MAX_SAFE_INTEGER);
  });
});
