import { db } from "../../prisma/db";

export interface ScheduledCharacterInfo {
  id: number;
  name: string;
  danbooruTag: string;
}

export interface ScheduledDeliveryTarget {
  userId: number;
  discordId: string;
  characters: ScheduledCharacterInfo[];
}

export async function findActiveDiscordUserByDiscordId(discordId: string) {
  return db.orm.public.DiscordUser.where({
    discordId,
    isActive: true,
  }).first();
}

/**
 * Aggregates all active users and their active scheduled characters for a given
 * weekday (`0..6`), deduplicating characters per user.
 */
export async function getScheduledCharactersForDay(
  dayOfWeek: number,
): Promise<ScheduledDeliveryTarget[]> {
  const schedules = await db.orm.public.CharacterSchedule.where({
    dayOfWeek,
    isActive: true,
  }).all();

  const targets = new Map<number, ScheduledDeliveryTarget>();

  for (const schedule of schedules) {
    const userCharacter = await db.orm.public.UserCharacter.where({
      id: schedule.userCharacterId,
      isActive: true,
    }).first();

    if (!userCharacter) continue;

    const [user, character] = await Promise.all([
      db.orm.public.DiscordUser.where({
        id: userCharacter.userId,
        isActive: true,
      }).first(),
      db.orm.public.Character.where({
        id: userCharacter.characterId,
        isActive: true,
      }).first(),
    ]);

    if (!user || !character) continue;

    const characterInfo: ScheduledCharacterInfo = {
      id: character.id,
      name: character.name,
      danbooruTag: character.danbooruTag,
    };

    const existingTarget = targets.get(user.id);

    if (existingTarget) {
      const alreadyExists = existingTarget.characters.some(
        (item) => item.id === character.id,
      );

      if (!alreadyExists) {
        existingTarget.characters.push(characterInfo);
      }

      continue;
    }

    targets.set(user.id, {
      userId: user.id,
      discordId: user.discordId,
      characters: [characterInfo],
    });
  }

  return Array.from(targets.values());
}

export async function hasUserReceivedArtwork(
  userId: number,
  artworkId: number,
) {
  const history = await db.orm.public.DeliveryHistory.where({
    userId,
    artworkId,
  }).first();

  return Boolean(history);
}

export async function createDeliveryHistory(data: {
  userId: number;
  artworkId: number;
  channelId: string;
  messageId: string;
}) {
  return db.orm.public.DeliveryHistory.create(data);
}

/**
 * Loads all active characters scheduled on `dayOfWeek` for a single Discord user.
 */
export async function getScheduledCharactersForUser(
  discordId: string,
  dayOfWeek: number,
): Promise<ScheduledDeliveryTarget | null> {
  const user = await findActiveDiscordUserByDiscordId(discordId);

  if (!user) return null;

  const userCharacters = await db.orm.public.UserCharacter.where({
    userId: user.id,
    isActive: true,
  }).all();

  const characters = await Promise.all(
    userCharacters.map(async (userCharacter) => {
      const schedule = await db.orm.public.CharacterSchedule.where({
        userCharacterId: userCharacter.id,
        dayOfWeek,
        isActive: true,
      }).first();

      if (!schedule) return null;

      const character = await db.orm.public.Character.where({
        id: userCharacter.characterId,
        isActive: true,
      }).first();

      if (!character) return null;

      return {
        id: character.id,
        name: character.name,
        danbooruTag: character.danbooruTag,
      };
    }),
  );

  return {
    userId: user.id,
    discordId: user.discordId,
    characters: characters.filter(
      (character): character is NonNullable<typeof character> =>
        character !== null,
    ),
  };
}

export async function getUserDeliveryForDate(
  userId: number,
  startOfDay: Date,
  endOfDay: Date,
) {
  return db.orm.public.DeliveryHistory.where({ userId })
    .where((history) => history.deliveredAt.gte(startOfDay))
    .where((history) => history.deliveredAt.lt(endOfDay))
    .first();
}
