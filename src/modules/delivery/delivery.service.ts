import {
  Client,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  ThreadChannel,
} from "discord.js";

import { getDeliveryChannel } from "../guild-config/guild-config.service";
import { db } from "../../prisma/db";

import {
  getScheduledCharactersForDay,
  findArtworkBySourceId,
  hasUserReceivedArtwork,
  createDeliveryHistory,
  getScheduledCharactersForUser,
  getUserDeliveryForDate,
} from "./delivery.repository";

import { fetchSfwArtworks } from "../../integrations/danbooru/danbooru.service";
import { saveDanbooruArtwork } from "../artwork/artwork.repository";

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function getJakartaDayOfWeek(): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  }).format(new Date());

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const day = dayMap[weekday];

  if (day === undefined) {
    throw new Error(`Invalid Jakarta weekday: ${weekday}`);
  }

  return day;
}

async function ensureThreadUsable(thread: ThreadChannel) {
  if (thread.locked) {
    throw new Error(
      "Configured delivery thread is locked. Please unlock it first.",
    );
  }

  if (!thread.archived) return;

  const botMember = await thread.guild.members.fetchMe();
  const permissions = thread.permissionsFor(botMember);

  if (!permissions?.has(PermissionFlagsBits.ManageThreads)) {
    throw new Error(
      "Bot needs Manage Threads permission to unarchive the delivery thread.",
    );
  }

  try {
    await thread.setArchived(false);
    console.log(`[DELIVERY] Successfully unarchived thread ${thread.id}.`);
  } catch (error) {
    console.error(`[DELIVERY] Failed to unarchive thread ${thread.id}:`, error);

    throw new Error("Unable to unarchive the configured delivery thread.");
  }
}

async function getConfiguredDeliveryChannel(client: Client) {
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!guildId) {
    throw new Error("DISCORD_GUILD_ID is not configured.");
  }

  const config = await getDeliveryChannel(guildId);

  if (!config) {
    throw new Error(
      `Delivery channel has not been configured for guild ${guildId}.`,
    );
  }

  const channel = await client.channels.fetch(config.deliveryChannelId);

  if (!channel || !("guildId" in channel) || channel.guildId !== guildId) {
    throw new Error(
      "Configured delivery destination is invalid or no longer accessible.",
    );
  }

  if (channel.isThread()) {
    await ensureThreadUsable(channel);
    return channel;
  }

  if (
    channel.type === ChannelType.GuildText ||
    channel.type === ChannelType.GuildAnnouncement
  ) {
    return channel;
  }

  throw new Error(
    "Configured delivery destination is not a supported text channel or thread.",
  );
}

async function deliverToUser(
  target: Awaited<ReturnType<typeof getScheduledCharactersForDay>>[number],
  channel: Awaited<ReturnType<typeof getConfiguredDeliveryChannel>>,
) {
  const characters = shuffle(target.characters);

  for (const character of characters) {
    let posts;

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

    for (const post of candidates) {
      if (!post.file_url) continue;

      // Find or save artwork.
      let artwork;

      try {
        artwork = await findArtworkBySourceId(String(post.id));

        if (!artwork) {
          artwork = await saveDanbooruArtwork(post);
        }
      } catch (error) {
        console.error(`[DELIVERY] Failed to save artwork ${post.id}:`, error);

        continue;
      }

      if (!artwork) {
        console.error(`[DELIVERY] Artwork ${post.id} could not be retrieved.`);

        continue;
      }

      // Avoid sending the same artwork to the same user.
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

      const embed = new EmbedBuilder()
        .setColor(0x9324b6)
        .setTitle(character.name)
        .setURL(`https://danbooru.donmai.us/posts/${post.id}`)
        .setImage(post.file_url)
        .setFooter({
          text: "Daily Waifu • Danbooru",
        });

      try {
        const message = await channel.send({
          content: `✨ Daily Waifu for <@${target.discordId}>!`,
          embeds: [embed],
          allowedMentions: {
            users: [target.discordId],
          },
        });

        // Save delivery history only after successful delivery.
        await createDeliveryHistory({
          userId: target.userId,
          artworkId: artwork.id,
          channelId: message.channelId,
          messageId: message.id,
        });

        console.log(`[DELIVERY] Sent ${character.name} to ${target.discordId}`);

        return true;
      } catch (error) {
        console.error(
          `[DELIVERY] Failed to send artwork ${post.id} to ${target.discordId}:`,
          error,
        );

        // Do not try another artwork after a send/history error.
        // The message may already have been sent successfully.
        throw error;
      }
    }
  }

  console.log(`[DELIVERY] No available artwork for ${target.discordId}`);

  return false;
}

export async function deliverDailyArtworks(client: Client) {
  const dayOfWeek = getJakartaDayOfWeek();

  // Get the channel configured through /setup.
  const channel = await getConfiguredDeliveryChannel(client);

  // Get all users with active schedules for today.
  const targets = await getScheduledCharactersForDay(dayOfWeek);

  console.log(`[DELIVERY] Starting delivery for ${targets.length} users`);

  const results = {
    total: targets.length,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  // Process users sequentially to avoid sending too many messages at once.
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

function getJakartaDateRange() {
  const now = new Date();

  // Convert current time to Jakarta's UTC+7.
  const jakartaNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

  // Start of the current Jakarta calendar day, converted back to UTC.
  const startOfDay = new Date(
    Date.UTC(
      jakartaNow.getUTCFullYear(),
      jakartaNow.getUTCMonth(),
      jakartaNow.getUTCDate(),
    ) -
      7 * 60 * 60 * 1000,
  );

  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  return { startOfDay, endOfDay };
}

async function getExistingDailyDelivery(userId: number) {
  const { startOfDay, endOfDay } = getJakartaDateRange();

  return getUserDeliveryForDate(userId, startOfDay, endOfDay);
}

function createMessageUrl(
  guildId: string,
  channelId: string,
  messageId: string,
) {
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
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

export async function deliverTodayArtwork(
  client: Client,
  discordId: string,
  guildId: string,
): Promise<DeliverTodayResult> {
  const user = await db.orm.public.DiscordUser.where({
    discordId,
    isActive: true,
  }).first();

  if (!user) {
    return { status: "no-schedule" };
  }

  // Check daily cooldown first.
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

  const channel = await getConfiguredDeliveryChannel(client);

  const delivered = await deliverToUser(target, channel);

  if (!delivered) {
    return { status: "no-artwork" };
  }

  return { status: "delivered" };
}
