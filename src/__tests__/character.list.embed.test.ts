import { describe, expect, it } from "vitest";

import {
  buildCharacterListEmbed,
  buildCharacterListPaginationRow,
  CHARACTER_LIST_PAGE_SIZE,
} from "../commands/character/character.list.embed";

describe("character list embed & pagination", () => {
  const sampleCharacters = Array.from({ length: 12 }, (_, index) => ({
    name: `Character ${index + 1}`,
    danbooruTag: `character_${index + 1}`,
    schedules: [0, 1, 5],
  }));

  it("uses 10 items per page and formats sorted schedules inside embed fields", () => {
    expect(CHARACTER_LIST_PAGE_SIZE).toBe(10);

    const pageZero = buildCharacterListEmbed(sampleCharacters, 0, 2).toJSON();
    expect(pageZero.title).toBe("Your Characters");
    expect(pageZero.fields).toHaveLength(10);
    expect(pageZero.fields?.[0]?.name).toBe("1. Character 1");
    expect(pageZero.fields?.[0]?.value).toContain("Mon, Fri, Sun");
    expect(pageZero.footer?.text).toBe("Page 1 of 2 • 12 character(s)");

    const pageOne = buildCharacterListEmbed(sampleCharacters, 1, 2).toJSON();
    expect(pageOne.fields).toHaveLength(2);
    expect(pageOne.fields?.[0]?.name).toBe("11. Character 11");
    expect(pageOne.footer?.text).toBe("Page 2 of 2 • 12 character(s)");
  });

  it("disables navigation buttons appropriately at boundaries and on timeout", () => {
    const firstPageButtons = buildCharacterListPaginationRow(0, 2).toJSON()
      .components;
    expect(firstPageButtons[0]?.disabled).toBe(true);
    expect(firstPageButtons[1]?.disabled).toBe(false);

    const lastPageButtons = buildCharacterListPaginationRow(1, 2).toJSON()
      .components;
    expect(lastPageButtons[0]?.disabled).toBe(false);
    expect(lastPageButtons[1]?.disabled).toBe(true);

    const expiredButtons = buildCharacterListPaginationRow(0, 2, true).toJSON()
      .components;
    expect(expiredButtons[0]?.disabled).toBe(true);
    expect(expiredButtons[1]?.disabled).toBe(true);
  });
});
