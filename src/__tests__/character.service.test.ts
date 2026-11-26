import { beforeEach, describe, expect, it, vi } from "vitest";

import * as danbooruService from "../integrations/danbooru/danbooru.service";
import {
  CharacterAlreadyExistsError,
  CharacterNotInListError,
} from "../modules/character/character.errors";
import * as characterRepository from "../modules/character/character.repository";
import {
  addCharacterToUser,
  listUserCharacters,
  removeCharacterFromUser,
  setCharacterSchedule,
} from "../modules/character/character.service";

vi.mock("../modules/character/character.repository");
vi.mock("../integrations/danbooru/danbooru.service");

describe("character service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a new character and sets its initial delivery schedule", async () => {
    vi.mocked(danbooruService.validateDanbooruCharacterTag).mockResolvedValue({
      id: 1,
      name: "furina_(genshin_impact)",
      category: 4,
      post_count: 100,
    });
    vi.mocked(characterRepository.findOrCreateDiscordUser).mockResolvedValue({
      id: 10,
      discordId: "user-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.findCharacterByTag).mockResolvedValue(null);
    vi.mocked(characterRepository.createCharacter).mockResolvedValue({
      id: 20,
      name: "Furina",
      danbooruTag: "furina_(genshin_impact)",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.findUserCharacter).mockResolvedValue(null);
    vi.mocked(characterRepository.addUserCharacter).mockResolvedValue({
      id: 30,
      userId: 10,
      characterId: 20,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.addCharacterSchedule).mockImplementation(
      async (userCharacterId, dayOfWeek) => ({
        id: dayOfWeek + 1,
        userCharacterId,
        dayOfWeek,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const result = await addCharacterToUser(
      "user-1",
      "Furina",
      "furina_(genshin_impact)",
      ["mon", "wed"],
    );

    expect(result.reactivated).toBe(false);
    expect(result.character.name).toBe("Furina");
    expect(characterRepository.deleteCharacterSchedules).toHaveBeenCalledWith(
      30,
    );
    expect(result.schedules.map((s) => s.dayOfWeek)).toEqual([1, 3]);
  });

  it("reactivates a previously soft-deleted character and replaces its schedule", async () => {
    vi.mocked(danbooruService.validateDanbooruCharacterTag).mockResolvedValue({
      id: 1,
      name: "furina_(genshin_impact)",
      category: 4,
      post_count: 100,
    });
    vi.mocked(characterRepository.findOrCreateDiscordUser).mockResolvedValue({
      id: 10,
      discordId: "user-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.findCharacterByTag).mockResolvedValue({
      id: 20,
      name: "Furina",
      danbooruTag: "furina_(genshin_impact)",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.findUserCharacter).mockResolvedValue({
      id: 30,
      userId: 10,
      characterId: 20,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.updateUserCharacterStatus).mockResolvedValue({
      id: 30,
      userId: 10,
      characterId: 20,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.addCharacterSchedule).mockImplementation(
      async (userCharacterId, dayOfWeek) => ({
        id: dayOfWeek + 1,
        userCharacterId,
        dayOfWeek,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const result = await addCharacterToUser(
      "user-1",
      "Furina",
      "furina_(genshin_impact)",
      ["sun"],
    );

    expect(result.reactivated).toBe(true);
    expect(
      characterRepository.updateUserCharacterStatus,
    ).toHaveBeenCalledWith(30, true);
    expect(result.schedules.map((s) => s.dayOfWeek)).toEqual([0]);
  });

  it("throws CharacterAlreadyExistsError when character is already active", async () => {
    vi.mocked(danbooruService.validateDanbooruCharacterTag).mockResolvedValue({
      id: 1,
      name: "furina_(genshin_impact)",
      category: 4,
      post_count: 100,
    });
    vi.mocked(characterRepository.findOrCreateDiscordUser).mockResolvedValue({
      id: 10,
      discordId: "user-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.findCharacterByTag).mockResolvedValue({
      id: 20,
      name: "Furina",
      danbooruTag: "furina_(genshin_impact)",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.findUserCharacter).mockResolvedValue({
      id: 30,
      userId: 10,
      characterId: 20,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      addCharacterToUser("user-1", "Furina", "furina_(genshin_impact)", ["mon"]),
    ).rejects.toBeInstanceOf(CharacterAlreadyExistsError);
  });

  it("replaces schedules using mapped weekday numbers", async () => {
    vi.mocked(characterRepository.findOrCreateDiscordUser).mockResolvedValue({
      id: 10,
      discordId: "user-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.findCharacterByTag).mockResolvedValue({
      id: 20,
      name: "Furina",
      danbooruTag: "furina_(genshin_impact)",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.findUserCharacter).mockResolvedValue({
      id: 30,
      userId: 10,
      characterId: 20,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.addCharacterSchedule).mockImplementation(
      async (userCharacterId, dayOfWeek) => ({
        id: dayOfWeek + 1,
        userCharacterId,
        dayOfWeek,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const schedules = await setCharacterSchedule(
      "user-1",
      "furina_(genshin_impact)",
      ["mon", "fri"],
    );

    expect(characterRepository.deleteCharacterSchedules).toHaveBeenCalledWith(
      30,
    );
    expect(schedules.map((s) => s.dayOfWeek)).toEqual([1, 5]);
  });

  it("orders listed characters and their schedules from Monday to Sunday", async () => {
    vi.mocked(characterRepository.findOrCreateDiscordUser).mockResolvedValue({
      id: 10,
      discordId: "user-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.getUserCharacters).mockResolvedValue([
      {
        id: 31,
        userId: 10,
        characterId: 21,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 32,
        userId: 10,
        characterId: 22,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 33,
        userId: 10,
        characterId: 23,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(characterRepository.getCharacterById).mockImplementation(
      async (id) => {
        const names: Record<number, { name: string; tag: string }> = {
          21: { name: "SundayChar", tag: "sunday_char" },
          22: { name: "UnscheduledChar", tag: "unscheduled_char" },
          23: { name: "MondayChar", tag: "monday_char" },
        };
        const entry = names[id];
        if (!entry) return null;
        return {
          id,
          name: entry.name,
          danbooruTag: entry.tag,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    );
    vi.mocked(characterRepository.getCharacterSchedules).mockImplementation(
      async (userCharacterId) => {
        if (userCharacterId === 31) {
          return [
            {
              id: 1,
              userCharacterId: 31,
              dayOfWeek: 0, // Sun
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];
        }
        if (userCharacterId === 33) {
          return [
            {
              id: 2,
              userCharacterId: 33,
              dayOfWeek: 5, // Fri
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 3,
              userCharacterId: 33,
              dayOfWeek: 1, // Mon
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];
        }
        return [];
      },
    );

    const items = await listUserCharacters("user-1");

    expect(items.map((item) => item.name)).toEqual([
      "MondayChar",
      "SundayChar",
      "UnscheduledChar",
    ]);
    expect(items[0]?.schedules).toEqual([1, 5]);
  });

  it("throws CharacterNotInListError when removing inactive character", async () => {
    vi.mocked(characterRepository.findOrCreateDiscordUser).mockResolvedValue({
      id: 10,
      discordId: "user-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.findCharacterByTag).mockResolvedValue({
      id: 20,
      name: "Furina",
      danbooruTag: "furina_(genshin_impact)",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.findUserCharacter).mockResolvedValue({
      id: 30,
      userId: 10,
      characterId: 20,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      removeCharacterFromUser("user-1", "furina_(genshin_impact)"),
    ).rejects.toBeInstanceOf(CharacterNotInListError);
  });
});
