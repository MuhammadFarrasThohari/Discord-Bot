import { z } from "zod";

import { VALID_DAY_CODES } from "../../shared/utils/date";

export const danbooruTagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Danbooru tag cannot be empty.")
  .max(100, "Danbooru tag must not exceed 100 characters.")
  .regex(/^[a-z0-9_!.'()\-]+$/, "Invalid Danbooru tag format.");

export const scheduleDaysSchema = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((day) => day.trim().toLowerCase())
      .filter(Boolean),
  )
  .pipe(
    z
      .array(z.enum(VALID_DAY_CODES))
      .min(1, "Select at least one day.")
      .refine(
        (days) => new Set(days).size === days.length,
        "Duplicate days are not allowed.",
      ),
  );

export const characterAddSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Character name cannot be empty.")
    .max(80, "Character name must not exceed 80 characters."),
  danbooruTag: danbooruTagSchema,
  days: scheduleDaysSchema,
});

export const characterTagSchema = z.object({
  danbooruTag: danbooruTagSchema,
});

export const characterScheduleSchema = z.object({
  danbooruTag: danbooruTagSchema,
  days: scheduleDaysSchema,
});
