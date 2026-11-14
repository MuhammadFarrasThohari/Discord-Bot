
import { db } from "../../prisma/db";

export interface ScheduledDeliveryTarget {
  userId: number;
  discordId: string;
  characters: {
    id: number;
    name: string;
    danbooruTag: string;
  }[];
}

export async function getScheduledCharactersForDay(
  dayOfWeek: number,
): Promise<ScheduledDeliveryTarget[]> {
  const schedules = await db.orm.public.CharacterSchedule.where({
    dayOfWeek,
    isActive: true,
  }).all();

  const targets = new Map<number, ScheduledDeliveryTarget>();

  for (const schedule of schedules) {
    // Get active user-character relation.
    const userCharacter = await db.orm.public.UserCharacter.where({
      id: schedule.userCharacterId,
      isActive: true,
    }).first();

    if (!userCharacter) continue;

    // Get user and character.
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

    const existingTarget = targets.get(user.id);

    if (existingTarget) {
      // Avoid adding the same character more than once.
      const alreadyExists = existingTarget.characters.some(
        (item) => item.id === character.id,
      );

      if (!alreadyExists) {
        existingTarget.characters.push({
          id: character.id,
          name: character.name,
          danbooruTag: character.danbooruTag,
        });
      }

      continue;
    }

    targets.set(user.id, {
      userId: user.id,
      discordId: user.discordId,
      characters: [
        {
          id: character.id,
          name: character.name,
          danbooruTag: character.danbooruTag,
        },
      ],
    });
  }

  return Array.from(targets.values());
}

export async function findArtworkBySourceId(sourceId: string) {
  return db.orm.public.Artwork.where({
    source: "danbooru",
    sourceId,
  }).first();
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
