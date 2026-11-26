import { db } from "../../prisma/db";

export async function findOrCreateDiscordUser(discordId: string) {
  const existing = await db.orm.public.DiscordUser.where({ discordId }).first();

  if (existing) return existing;

  return db.orm.public.DiscordUser.create({ discordId });
}

export async function findCharacterByTag(danbooruTag: string) {
  return db.orm.public.Character.where({ danbooruTag }).first();
}

export async function createCharacter(name: string, danbooruTag: string) {
  return db.orm.public.Character.create({ name, danbooruTag });
}

export async function findUserCharacter(userId: number, characterId: number) {
  return db.orm.public.UserCharacter.where({ userId, characterId }).first();
}

export async function addUserCharacter(userId: number, characterId: number) {
  return db.orm.public.UserCharacter.create({ userId, characterId });
}

export async function addCharacterSchedule(
  userCharacterId: number,
  dayOfWeek: number,
) {
  return db.orm.public.CharacterSchedule.create({
    userCharacterId,
    dayOfWeek,
  });
}

export async function getUserCharacters(userId: number) {
  return db.orm.public.UserCharacter.where({
    userId,
    isActive: true,
  }).all();
}

export async function getCharacterSchedules(userCharacterId: number) {
  return db.orm.public.CharacterSchedule.where({
    userCharacterId,
    isActive: true,
  }).all();
}

export async function getCharacterById(id: number) {
  return db.orm.public.Character.where({ id }).first();
}

/**
 * Toggles the active flag on a user-character link instead of hard-deleting
 * so historical `DeliveryHistory` and schedule records remain intact.
 */
export async function updateUserCharacterStatus(id: number, isActive: boolean) {
  return db.orm.public.UserCharacter.where({ id }).update({ isActive });
}

/**
 * Deletes all schedule rows belonging to a single user-character relation
 * before inserting a replacement set.
 */
export async function deleteCharacterSchedules(userCharacterId: number) {
  return db.orm.public.CharacterSchedule.where({ userCharacterId }).deleteAll();
}
