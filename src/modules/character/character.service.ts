import {
  addCharacterSchedule,
  addUserCharacter,
  createCharacter,
  deleteCharacterSchedules,
  findCharacterByTag,
  findCharacterSchedule,
  findOrCreateDiscordUser,
  findUserCharacter,
  getCharacterById,
  getCharacterSchedules,
  getUserCharacters,
  updateUserCharacterStatus,
} from "./character.repository";
import {
  CharacterAlreadyExistsError,
  CharacterNotFoundError,
  CharacterNotInListError,
} from "./character.errors";
import { validateDanbooruCharacterTag } from "../../integrations/danbooru/danbooru.service";

const DAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export async function addCharacterToUser(
  discordId: string,
  name: string,
  danbooruTag: string,
) {
  // Validate Danbooru tag first.
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

export async function setCharacterSchedule(
  discordId: string,
  danbooruTag: string,
  rawDays: string,
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

  const days = [
    ...new Set(rawDays.split(",").map((day) => day.trim().toLowerCase())),
  ];

  const invalidDays = days.filter((day) => !(day in DAY_MAP));

  if (invalidDays.length > 0 || days.length === 0) {
    throw new Error("Invalid days. Use: mon,tue,wed,thu,fri,sat,sun");
  }

  // Hapus jadwal sebelumnya.
  await deleteCharacterSchedules(userCharacter.id);

  // Buat jadwal baru.
  const schedules = [];

  for (const day of days) {
    schedules.push(await addCharacterSchedule(userCharacter.id, DAY_MAP[day]));
  }

  return schedules;
}

export async function listUserCharacters(discordId: string) {
  const user = await findOrCreateDiscordUser(discordId);
  const userCharacters = await getUserCharacters(user.id);

  const result = [];

  for (const userCharacter of userCharacters) {
    const character = await getCharacterById(userCharacter.characterId);

    if (!character) continue;

    const schedules = await getCharacterSchedules(userCharacter.id);

    result.push({
      ...character,
      schedules: schedules.map((schedule) => schedule.dayOfWeek),
    });
  }

  return result;
}

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
