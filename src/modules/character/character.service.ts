import { validateDanbooruCharacterTag } from "../../integrations/danbooru/danbooru.service";
import { DAY_CODE_TO_NUMBER, type DayCode } from "../../shared/utils/date";
import {
  CharacterAlreadyExistsError,
  CharacterNotFoundError,
  CharacterNotInListError,
} from "./character.errors";
import {
  addCharacterSchedule,
  addUserCharacter,
  createCharacter,
  deleteCharacterSchedules,
  findCharacterByTag,
  findOrCreateDiscordUser,
  findUserCharacter,
  getCharacterById,
  getCharacterSchedules,
  getUserCharacters,
  updateUserCharacterStatus,
} from "./character.repository";

/**
 * Validates the Danbooru tag remotely, ensures the character exists in the
 * shared catalog, and links it to the user (reactivating a previously removed
 * link if one exists).
 */
export async function addCharacterToUser(
  discordId: string,
  name: string,
  danbooruTag: string,
) {
  const danbooruTagData = await validateDanbooruCharacterTag(danbooruTag);
  const user = await findOrCreateDiscordUser(discordId);

  let character = await findCharacterByTag(danbooruTagData.name);

  if (!character) {
    character = await createCharacter(name, danbooruTagData.name);
  }

  const existing = await findUserCharacter(user.id, character.id);

  if (existing?.isActive) {
    throw new CharacterAlreadyExistsError();
  }

  if (existing) {
    const reactivated = await updateUserCharacterStatus(existing.id, true);

    return {
      character,
      userCharacter: reactivated,
      reactivated: true,
    };
  }

  const userCharacter = await addUserCharacter(user.id, character.id);

  return {
    character,
    userCharacter,
    reactivated: false,
  };
}

/**
 * Replaces a user's delivery days for an active character using a delete-and-insert
 * strategy so callers always provide the full authoritative weekly schedule.
 */
export async function setCharacterSchedule(
  discordId: string,
  danbooruTag: string,
  days: readonly DayCode[],
) {
  const uniqueDays = [...new Set(days)];

  if (uniqueDays.length === 0) {
    throw new Error("Invalid days. Use: mon,tue,wed,thu,fri,sat,sun");
  }

  const user = await findOrCreateDiscordUser(discordId);
  const character = await findCharacterByTag(danbooruTag);

  if (!character) {
    throw new CharacterNotFoundError();
  }

  const userCharacter = await findUserCharacter(user.id, character.id);

  if (!userCharacter?.isActive) {
    throw new CharacterNotInListError();
  }

  await deleteCharacterSchedules(userCharacter.id);

  const schedules = [];

  for (const day of uniqueDays) {
    schedules.push(
      await addCharacterSchedule(userCharacter.id, DAY_CODE_TO_NUMBER[day]),
    );
  }

  return schedules;
}

/**
 * Lists all active characters and their configured weekday numbers for a user.
 */
export async function listUserCharacters(discordId: string) {
  const user = await findOrCreateDiscordUser(discordId);
  const userCharacters = await getUserCharacters(user.id);

  const items = await Promise.all(
    userCharacters.map(async (userCharacter) => {
      const [character, schedules] = await Promise.all([
        getCharacterById(userCharacter.characterId),
        getCharacterSchedules(userCharacter.id),
      ]);

      if (!character) return null;

      return {
        ...character,
        schedules: schedules.map((schedule) => schedule.dayOfWeek),
      };
    }),
  );

  return items.filter(
    (item): item is NonNullable<typeof item> => item !== null,
  );
}

/**
 * Soft-deletes a character from a user's active list by setting `isActive = false`.
 */
export async function removeCharacterFromUser(
  discordId: string,
  danbooruTag: string,
) {
  const user = await findOrCreateDiscordUser(discordId);
  const character = await findCharacterByTag(danbooruTag);

  if (!character) {
    throw new CharacterNotFoundError();
  }

  const userCharacter = await findUserCharacter(user.id, character.id);

  if (!userCharacter?.isActive) {
    throw new CharacterNotInListError();
  }

  await updateUserCharacterStatus(userCharacter.id, false);

  return character;
}
