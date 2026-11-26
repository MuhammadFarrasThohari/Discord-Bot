import type { Client } from "discord.js";

import { fetchSfwArtworks } from "../../integrations/danbooru/danbooru.service";
import type { DanbooruPost } from "../../integrations/danbooru/danbooru.types";
import { shuffle } from "../../shared/utils/array";
import {
  getJakartaDateRange,
  getJakartaDayOfWeek,
} from "../../shared/utils/date";
import {
  findArtworkById,
  findArtworkBySourceId,
  saveDanbooruArtwork,
} from "../artwork/artwork.repository";
import { getConfiguredDeliveryChannel } from "./delivery.channel";
import { createMessageUrl, createWaifuMessagePayload } from "./delivery.embed";
import {
  createDeliveryHistory,
  findActiveDiscordUserByDiscordId,
  getScheduledCharactersForDay,
  getScheduledCharactersForUser,
  getUserDeliveriesForDate,
  hasUserReceivedArtwork,
  type ScheduledCharacterInfo,
  type ScheduledDeliveryTarget,
} from "./delivery.repository";

type DeliveryChannel = Awaited<ReturnType<typeof getConfiguredDeliveryChannel>>;

interface PendingDeliveryMessage {
  character: ScheduledCharacterInfo;
  artworkId: number;
  payload: ReturnType<typeof createWaifuMessagePayload>;
}

export type DeliverTodayResult =
  | {
      status: "already-delivered";
      messageUrl: string;
    }
  | {
      status: "no-schedule";
    }
  | {
      status: "delivered";
      deliveredCharacters: string[];
    }
  | {
      status: "no-artwork";
    };

async function getOrCreateDanbooruArtwork(post: DanbooruPost) {
  const existing = await findArtworkBySourceId(String(post.id));

  if (existing) return existing;

  return saveDanbooruArtwork(post);
}

/**
 * Filters `scheduledCharacters` down to characters that have not yet been
 * delivered to `userId` on the current Jakarta calendar day.
 *
 * Uses `DeliveryHistory.characterId` when present, and falls back to matching
 * `Artwork.tagString` for legacy history rows created before `characterId` existed.
 */
async function filterPendingCharactersForToday(
  userId: number,
  scheduledCharacters: readonly ScheduledCharacterInfo[],
) {
  const { startOfDay, endOfDay } = getJakartaDateRange();
  const existingDeliveries = await getUserDeliveriesForDate(
    userId,
    startOfDay,
    endOfDay,
  );

  if (existingDeliveries.length === 0) {
    return {
      pendingCharacters: [...scheduledCharacters],
      existingDeliveries,
    };
  }

  const deliveredCharacterIds = new Set<number>();
  const legacyDeliveries = [];

  for (const delivery of existingDeliveries) {
    if (delivery.characterId !== null && delivery.characterId !== undefined) {
      deliveredCharacterIds.add(delivery.characterId);
    } else {
      legacyDeliveries.push(delivery);
    }
  }

  const legacyDeliveredTags = new Set<string>();

  if (legacyDeliveries.length > 0) {
    const legacyArtworks = await Promise.all(
      legacyDeliveries.map((delivery) => findArtworkById(delivery.artworkId)),
    );

    for (const artwork of legacyArtworks) {
      if (!artwork?.tagString) continue;

      for (const tag of artwork.tagString.split(/\s+/)) {
        if (tag) {
          legacyDeliveredTags.add(tag.toLowerCase());
        }
      }
    }
  }

  const pendingCharacters = scheduledCharacters.filter(
    (character) =>
      !deliveredCharacterIds.has(character.id) &&
      !legacyDeliveredTags.has(character.danbooruTag.toLowerCase()),
  );

  return {
    pendingCharacters,
    existingDeliveries,
  };
}

/**
 * Selects at most one unseen SFW artwork for each pending scheduled character.
 * Characters and fetched posts are shuffled so repeated schedules vary naturally,
 * and `DeliveryHistory` prevents sending duplicate artworks to the same user.
 */
async function buildPendingDeliveriesForUser(
  target: ScheduledDeliveryTarget,
): Promise<PendingDeliveryMessage[]> {
  const characters = shuffle(target.characters);
  const messages: PendingDeliveryMessage[] = [];

  for (const character of characters) {
    let posts: DanbooruPost[];
    console.log(`[DELIVERY] Fetching artwork for ${character.name}`);

    try {
      posts = await fetchSfwArtworks({
        tags: [character.danbooruTag],
        page: 1,
      });
    } catch (error) {
      console.error(
        `[DELIVERY] Failed to fetch artwork for ${character.name}:`,
        error,
      );
      continue;
    }

    const candidates = shuffle(posts);
    console.log(
      `[DELIVERY] Found ${candidates.length} candidate(s) for ${character.name}`,
    );

    for (const post of candidates) {
      if (!post.file_url) continue;

      let artwork;

      try {
        artwork = await getOrCreateDanbooruArtwork(post);
      } catch (error) {
        console.error(`[DELIVERY] Failed to save artwork ${post.id}:`, error);
        continue;
      }

      if (!artwork) {
        console.error(`[DELIVERY] Artwork ${post.id} could not be retrieved.`);
        continue;
      }

      let alreadyDelivered: boolean;

      try {
        alreadyDelivered = await hasUserReceivedArtwork(
          target.userId,
          artwork.id,
        );
      } catch (error) {
        console.error(
          `[DELIVERY] Failed to check delivery history for artwork ${artwork.id}:`,
          error,
        );
        continue;
      }

      if (alreadyDelivered) continue;

      messages.push({
        character,
        artworkId: artwork.id,
        payload: createWaifuMessagePayload(
          target.discordId,
          character.name,
          post.id,
          post.file_url,
        ),
      });

      // Only one artwork per scheduled character is delivered per run.
      break;
    }
  }

  return messages;
}

/**
 * Sends all prepared character artworks for a single user and records each
 * delivered message (including `characterId`) in `DeliveryHistory`.
 */
async function deliverToUser(
  target: ScheduledDeliveryTarget,
  channel: DeliveryChannel,
): Promise<ScheduledCharacterInfo[]> {
  const pendingMessages = await buildPendingDeliveriesForUser(target);
  const sentCharacters: ScheduledCharacterInfo[] = [];

  for (const message of pendingMessages) {
    try {
      const sentMessage = await channel.send(message.payload);

      await createDeliveryHistory({
        userId: target.userId,
        characterId: message.character.id,
        artworkId: message.artworkId,
        channelId: sentMessage.channel.id,
        messageId: sentMessage.id,
      });

      sentCharacters.push(message.character);

      console.log(
        `[DELIVERY] Successfully sent message for ${message.character.name} to ${target.discordId}`,
      );
    } catch (error) {
      console.error(
        `[DELIVERY] Failed to send message for ${message.character.name} to ${target.discordId}:`,
        error,
      );
    }
  }

  return sentCharacters;
}

/**
 * Runs the scheduled daily artwork delivery for all users with active schedules
 * on the current Jakarta weekday. Users are processed sequentially to avoid
 * bursting Discord channel message rate limits, and only characters not yet
 * delivered today (e.g. via `/waifu today`) are sent.
 */
export async function deliverDailyArtworks(client: Client) {
  const dayOfWeek = getJakartaDayOfWeek();
  const channel = await getConfiguredDeliveryChannel(client);
  const targets = await getScheduledCharactersForDay(dayOfWeek);

  console.log(`[DELIVERY] Starting delivery for ${targets.length} users`);

  const results = {
    total: targets.length,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  for (const target of targets) {
    try {
      const { pendingCharacters } = await filterPendingCharactersForToday(
        target.userId,
        target.characters,
      );

      if (pendingCharacters.length === 0) {
        results.skipped++;
        continue;
      }

      const delivered = await deliverToUser(
        { ...target, characters: pendingCharacters },
        channel,
      );

      if (delivered.length > 0) {
        results.success++;
      } else {
        results.skipped++;
      }
    } catch (error) {
      results.failed++;
      console.error(`[DELIVERY] Failed for ${target.discordId}:`, error);
    }
  }

  console.log("[DELIVERY] Finished:", results);

  return results;
}

/**
 * Handles on-demand `/waifu today` requests. Checks per-character delivery
 * history for the current Jakarta day so any newly added or previously missed
 * scheduled characters are still delivered without duplicating already-sent ones.
 */
export async function deliverTodayArtwork(
  client: Client,
  discordId: string,
  guildId: string,
): Promise<DeliverTodayResult> {
  const user = await findActiveDiscordUserByDiscordId(discordId);

  if (!user) {
    return { status: "no-schedule" };
  }

  const dayOfWeek = getJakartaDayOfWeek();
  const target = await getScheduledCharactersForUser(discordId, dayOfWeek);

  if (!target || target.characters.length === 0) {
    return { status: "no-schedule" };
  }

  const { pendingCharacters, existingDeliveries } =
    await filterPendingCharactersForToday(user.id, target.characters);

  if (pendingCharacters.length === 0) {
    const latestDelivery = existingDeliveries.reduce((latest, current) =>
      current.deliveredAt.getTime() >= latest.deliveredAt.getTime()
        ? current
        : latest,
    );

    return {
      status: "already-delivered",
      messageUrl: createMessageUrl(
        guildId,
        latestDelivery.channelId,
        latestDelivery.messageId,
      ),
    };
  }

  const channel = await getConfiguredDeliveryChannel(client, guildId);
  const delivered = await deliverToUser(
    { ...target, characters: pendingCharacters },
    channel,
  );

  if (delivered.length === 0) {
    return { status: "no-artwork" };
  }

  return {
    status: "delivered",
    deliveredCharacters: delivered.map((character) => character.name),
  };
}
