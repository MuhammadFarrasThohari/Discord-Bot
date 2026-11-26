import type { Client } from "discord.js";

import { fetchSfwArtworks } from "../../integrations/danbooru/danbooru.service";
import type { DanbooruPost } from "../../integrations/danbooru/danbooru.types";
import { shuffle } from "../../shared/utils/array";
import {
  getJakartaDateRange,
  getJakartaDayOfWeek,
} from "../../shared/utils/date";
import {
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
  getUserDeliveryForDate,
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
    }
  | {
      status: "no-artwork";
    };

async function getExistingDailyDelivery(userId: number) {
  const { startOfDay, endOfDay } = getJakartaDateRange();

  return getUserDeliveryForDate(userId, startOfDay, endOfDay);
}

async function getOrCreateDanbooruArtwork(post: DanbooruPost) {
  const existing = await findArtworkBySourceId(String(post.id));

  if (existing) return existing;

  return saveDanbooruArtwork(post);
}

/**
 * Selects at most one unseen SFW artwork for each scheduled character of a user.
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

    for (const post of shuffle(posts)) {
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
 * delivered message in `DeliveryHistory` immediately after Discord confirms send.
 */
async function deliverToUser(
  target: ScheduledDeliveryTarget,
  channel: DeliveryChannel,
): Promise<boolean> {
  const pendingMessages = await buildPendingDeliveriesForUser(target);

  for (const message of pendingMessages) {
    try {
      const sentMessage = await channel.send(message.payload);

      await createDeliveryHistory({
        userId: target.userId,
        artworkId: message.artworkId,
        channelId: sentMessage.channel.id,
        messageId: sentMessage.id,
      });

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

  return pendingMessages.length > 0;
}

/**
 * Runs the scheduled daily artwork delivery for all users with active schedules
 * on the current Jakarta weekday. Users are processed sequentially to avoid
 * bursting Discord channel message rate limits, and users who already received
 * a delivery today (e.g. via `/waifu today`) are skipped.
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
      const existingDelivery = await getExistingDailyDelivery(target.userId);

      if (existingDelivery) {
        results.skipped++;
        continue;
      }

      const delivered = await deliverToUser(target, channel);

      if (delivered) {
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
 * Handles on-demand `/waifu today` requests. Enforces a once-per-Jakarta-day
 * cooldown by checking `DeliveryHistory` before resolving scheduled characters
 * and delivering to the configured guild channel.
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

  // Enforce daily cooldown before querying Danbooru or sending messages.
  const existingDelivery = await getExistingDailyDelivery(user.id);

  if (existingDelivery) {
    return {
      status: "already-delivered",
      messageUrl: createMessageUrl(
        guildId,
        existingDelivery.channelId,
        existingDelivery.messageId,
      ),
    };
  }

  const dayOfWeek = getJakartaDayOfWeek();
  const target = await getScheduledCharactersForUser(discordId, dayOfWeek);

  if (!target || target.characters.length === 0) {
    return { status: "no-schedule" };
  }

  const channel = await getConfiguredDeliveryChannel(client, guildId);
  const delivered = await deliverToUser(target, channel);

  if (!delivered) {
    return { status: "no-artwork" };
  }

  return { status: "delivered" };
}
