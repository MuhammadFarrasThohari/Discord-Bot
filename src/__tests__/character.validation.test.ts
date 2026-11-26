import { describe, expect, it } from "vitest";

import {
  characterAddSchema,
  characterScheduleSchema,
  characterTagSchema,
} from "../modules/character/character.validation";

describe("character validation schemas", () => {
  it("normalizes and validates character add input including required days", () => {
    const parsed = characterAddSchema.parse({
      name: "  Furina  ",
      danbooruTag: "  Furina_(Genshin_Impact) ",
      days: " Mon, fri, SUN ",
    });

    expect(parsed).toEqual({
      name: "Furina",
      danbooruTag: "furina_(genshin_impact)",
      days: ["mon", "fri", "sun"],
    });
  });

  it("rejects character add input when days are missing or invalid", () => {
    const missingDays = characterAddSchema.safeParse({
      name: "Furina",
      danbooruTag: "furina_(genshin_impact)",
      days: "",
    });

    expect(missingDays.success).toBe(false);
  });

  it("rejects invalid danbooru tag characters", () => {
    const result = characterTagSchema.safeParse({
      danbooruTag: "furina genshin",
    });

    expect(result.success).toBe(false);
  });

  it("parses comma-separated days and rejects duplicates", () => {
    const valid = characterScheduleSchema.parse({
      danbooruTag: "furina_(genshin_impact)",
      days: " Mon, wed ,FRI ",
    });

    expect(valid.days).toEqual(["mon", "wed", "fri"]);

    const duplicate = characterScheduleSchema.safeParse({
      danbooruTag: "furina_(genshin_impact)",
      days: "mon,mon",
    });

    expect(duplicate.success).toBe(false);
  });
});
