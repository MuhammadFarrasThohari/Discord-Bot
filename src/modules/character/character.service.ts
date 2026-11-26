import { validateDanbooruCharacterTag } from "../../integrations/danbooru/danbooru.service";
import {
  DAY_CODE_TO_NUMBER,
  type DayCode,
  getEarliestWeekdaySortKey,
  sortWeekdayNumbers,
  WEEKDAY_MON_FIRST_ORDER,
} from "../../shared/utils/date";
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
 * Replaces all weekday schedules for a user-character link using a delete-and-insert
 * strategy so the persisted schedule matches the provided authoritative day list.
 */
async function replaceUserCharacterSchedules(
  userCharacterId: number,
  days: readonly DayCode[],
) {
  const uniqueDays = [...new Set(days)];

  if (uniqueDays.length === 0) {
    throw new Error("Invalid days. Use: mon,tue,wed,thu,fri,sat,sun");
  }

  await deleteCharacterSchedules(userCharacterId);

  const schedules = [];

  for (const day of uniqueDays) {
    schedules.push(
      await addCharacterSchedule(userCharacterId, DAY_CODE_TO_NUMBER[day]),
    );
  }

  return schedules;
}

/**
 * Compares two character schedule lists using Monday-first weekday rank so
 * characters scheduled earlier in the week appear first (unscheduled last).
 */
function compareCharacterSchedules(
  a: { name: string; schedules: number[] },
  b: { name: string; schedules: number[] },
): number {
  const earliestDiff =
    getEarliestWeekdaySortKey(a.schedules) -
    getEarliestWeekdaySortKey(b.schedules);

  if (earliestDiff !== 0) return earliestDiff;

  const minLength = Math.min(a.schedules.length, b.schedules.length);

  for (let i = 0; i < minLength; i++) {
    const rankA = WEEKDAY_MON_FIRST_ORDER[a.schedules[i]!] ?? Number.MAX_SAFE_INTEGER;
    const rankB = WEEKDAY_MON_FIRST_ORDER[b.schedules[i]!] ?? Number.MAX_SAFE_INTEGER;

    if (rankA !== rankB) {
      return rankA - rankB;
    }
  }

  if (a.schedules.length !== b.schedules.length) {
    return a.schedules.length - b.schedules.length;
  }

  return a.name.localeCompare(b.name);
}

/**
 * Validates the Danbooru tag remotely, ensures the character exists in the
 * shared catalog, links (or reactivates) it for the user, and configures the
 * initial delivery schedule in one flow.
 */
export async function addCharacterToUser(
  discordId: string,
  name: string,
  danbooruTag: string,
  days: readonly DayCode[],
) {
  const uniqueDays = [...new Set(days)];

  if (uniqueDays.length === 0) {
    throw new Error("Invalid days. Use: mon,tue,wed,thu,fri,sat,sun");
  }

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
    const schedules = await replaceUserCharacterSchedules(
      reactivated?.id ?? existing.id,
      uniqueDays,
    );

    return {
      character,
      userCharacter: reactivated,
      reactivated: true,
      schedules,
    };
  }

  const userCharacter = await addUserCharacter(user.id, character.id);
  const schedules = await replaceUserCharacterSchedules(
    userCharacter.id,
    uniqueDays,
  );

  return {
    character,
    userCharacter,
    reactivated: false,
    schedules,
  };
}

/**
 * Replaces a user's delivery days for an active character.
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

  return replaceUserCharacterSchedules(userCharacter.id, uniqueDays);
}

/**
 * Lists all active characters for a user, ordered Monday-to-Sunday by their
 * scheduled delivery days (with unscheduled characters placed at the end).
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
        schedules: sortWeekdayNumbers(
          schedules.map((schedule) => schedule.dayOfWeek),
        ),
      };
    }),
  );

  return items
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort(compareCharacterSchedules);
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
