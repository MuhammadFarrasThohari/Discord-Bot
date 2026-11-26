import { beforeEach, describe, expect, it, vi } from "vitest";

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
import * as danbooruService from "../integrations/danbooru/danbooru.service";

vi.mock("../modules/character/character.repository");
vi.mock("../integrations/danbooru/danbooru.service");

describe("character service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a new character after validating its Danbooru tag", async () => {
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

    const result = await addCharacterToUser(
      "user-1",
      "Furina",
      "furina_(genshin_impact)",
    );

    expect(result.reactivated).toBe(false);
    expect(result.character.name).toBe("Furina");
  });

  it("reactivates a previously soft-deleted character", async () => {
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

    const result = await addCharacterToUser(
      "user-1",
      "Furina",
      "furina_(genshin_impact)",
    );

    expect(result.reactivated).toBe(true);
    expect(
      characterRepository.updateUserCharacterStatus,
    ).toHaveBeenCalledWith(30, true);
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
      addCharacterToUser("user-1", "Furina", "furina_(genshin_impact)"),
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

  it("lists active characters with their schedule days", async () => {
    vi.mocked(characterRepository.findOrCreateDiscordUser).mockResolvedValue({
      id: 10,
      discordId: "user-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.getUserCharacters).mockResolvedValue([
      {
        id: 30,
        userId: 10,
        characterId: 20,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(characterRepository.getCharacterById).mockResolvedValue({
      id: 20,
      name: "Furina",
      danbooruTag: "furina_(genshin_impact)",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(characterRepository.getCharacterSchedules).mockResolvedValue([
      {
        id: 1,
        userCharacterId: 30,
        dayOfWeek: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const items = await listUserCharacters("user-1");

    expect(items).toHaveLength(1);
    expect(items[0]?.schedules).toEqual([1]);
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
