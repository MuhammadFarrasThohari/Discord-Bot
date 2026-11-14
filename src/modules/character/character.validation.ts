
import { z } from "zod";

export const characterAddSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Character name cannot be empty.")
    .max(80, "Character name must not exceed 80 characters."),

  danbooruTag: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Danbooru tag cannot be empty.")
    .max(100, "Danbooru tag must not exceed 100 characters.")
    .regex(
      /^[a-z0-9_!.'()\-]+$/,
      "Invalid Danbooru tag format.",
    ),
});

export const characterTagSchema = z.object({
  danbooruTag: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Danbooru tag cannot be empty.")
    .max(100, "Danbooru tag must not exceed 100 characters.")
    .regex(
      /^[a-z0-9_!.'()\-]+$/,
      "Invalid Danbooru tag format.",
    ),
});

const validDays = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

export const characterScheduleSchema = z.object({
  danbooruTag: characterTagSchema.shape.danbooruTag,

  days: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((day) => day.trim().toLowerCase())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.enum(validDays))
        .min(1, "Select at least one day.")
        .refine(
          (days) => new Set(days).size === days.length,
          "Duplicate days are not allowed.",
        ),
    ),
});
