import {
  ChannelType,
  type Client,
  PermissionFlagsBits,
  type ThreadChannel,
} from "discord.js";

import { getBotEnv } from "../../config/env";
import { getDeliveryChannel } from "../guild-config/guild-config.service";

/**
 * Ensures a configured delivery thread is unlocked and unarchived before sending.
 * Discord auto-archives inactive threads after a configured duration, so the bot
 * checks `ManageThreads` permission and attempts to reopen archived threads.
 */
export async function ensureThreadUsable(thread: ThreadChannel) {
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

/**
 * Resolves and validates the guild's configured Discord delivery channel or thread.
 * Verifies guild ownership to prevent cross-guild delivery and unarchives threads
 * when possible.
 */
export async function getConfiguredDeliveryChannel(
  client: Client,
  guildId: string = getBotEnv().DISCORD_GUILD_ID,
) {
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
