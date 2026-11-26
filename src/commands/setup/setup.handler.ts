import {
  ChannelType,
  type ChatInputCommandInteraction,
  type GuildBasedChannel,
  PermissionFlagsBits,
} from "discord.js";

import { setDeliveryChannel } from "../../modules/guild-config/guild-config.service";

const THREAD_TYPES = [
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
] as const;

type SendableGuildChannel = Extract<
  GuildBasedChannel,
  { send: (...args: never[]) => unknown }
>;

/**
 * Validates that the selected Discord destination exists in the current guild,
 * is a supported text channel or thread, and is not an archived/locked thread.
 */
async function validateTargetChannel(
  interaction: ChatInputCommandInteraction,
): Promise<{ channel: SendableGuildChannel; isThread: boolean } | null> {
  const guild = interaction.guild!;
  const selectedChannel = interaction.options.getChannel("channel", true);
  const channel = await interaction.client.channels.fetch(selectedChannel.id);

  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    await interaction.editReply("Please select a valid text channel or thread.");
    return null;
  }

  if (!("guildId" in channel) || channel.guildId !== guild.id) {
    await interaction.editReply("The selected channel belongs to another server.");
    return null;
  }

  const isThread = THREAD_TYPES.includes(
    channel.type as (typeof THREAD_TYPES)[number],
  );

  if (
    channel.type !== ChannelType.GuildText &&
    channel.type !== ChannelType.GuildAnnouncement &&
    !isThread
  ) {
    await interaction.editReply("Only text channels and threads are supported.");
    return null;
  }

  // Threads must be active and unlocked so scheduled deliveries do not fail later.
  if (isThread && "archived" in channel && (channel.archived || channel.locked)) {
    await interaction.editReply(
      "The selected thread must be unarchived and unlocked before it can be configured.",
    );
    return null;
  }

  return {
    channel: channel as SendableGuildChannel,
    isThread,
  };
}

/**
 * Verifies the bot holds all permissions needed to post embeds in the target
 * channel or thread before attempting a live test message.
 */
async function ensureBotChannelPermissions(
  interaction: ChatInputCommandInteraction,
  channel: GuildBasedChannel,
  isThread: boolean,
): Promise<boolean> {
  const botMember = interaction.guild!.members.me;

  if (!botMember) {
    await interaction.editReply(
      "Unable to verify bot permissions. Please try again.",
    );
    return false;
  }

  const permissions = channel.permissionsFor(botMember);
  const requiredPermissions = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.EmbedLinks,
    isThread
      ? PermissionFlagsBits.SendMessagesInThreads
      : PermissionFlagsBits.SendMessages,
  ];

  if (!permissions?.has(requiredPermissions)) {
    await interaction.editReply(
      `I need the following permissions in the selected ${isThread ? "thread" : "channel"}:\n- View Channel\n- ${isThread ? "Send Messages in Threads" : "Send Messages"}\n- Embed Links`,
    );
    return false;
  }

  return true;
}

/**
 * Configures the guild's Daily Waifu delivery destination (`/setup`).
 * Sends a live confirmation message before persisting `GuildConfig` so broken
 * channel permissions are caught immediately rather than failing during the 08:00 job.
 */
export async function handleSetupCommand(
  interaction: ChatInputCommandInteraction,
) {
  await interaction.deferReply({ ephemeral: true });

  try {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.editReply(
        "This command can only be used inside a server.",
      );
      return;
    }

    if (
      !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
      await interaction.editReply(
        "You must be a server administrator to use this command.",
      );
      return;
    }

    const target = await validateTargetChannel(interaction);

    if (!target) return;

    const hasPermissions = await ensureBotChannelPermissions(
      interaction,
      target.channel,
      target.isThread,
    );

    if (!hasPermissions) return;

    try {
      await target.channel.send({
        content:
          "✨ Daily Waifu has been configured! Daily artwork deliveries will appear here at 08:00 WIB.",
      });
    } catch (error) {
      console.error("[SETUP] Failed to send confirmation message:", error);

      await interaction.editReply(
        "I couldn't send a message to the selected channel. Please check my permissions.",
      );
      return;
    }

    const result = await setDeliveryChannel(
      interaction.guild.id,
      target.channel.id,
    );

    await interaction.editReply(
      result.created
        ? `Daily Waifu has been configured successfully! All deliveries will be sent to <#${target.channel.id}>.`
        : `Delivery destination has been updated successfully to <#${target.channel.id}>.`,
    );

    console.log(
      `[SETUP] ${result.created ? "Created" : "Updated"} delivery destination for guild ${interaction.guild.id}: ${target.channel.id}`,
    );
  } catch (error) {
    console.error("[SETUP] Failed to configure delivery destination:", error);

    await interaction.editReply(
      "An unexpected error occurred while configuring Daily Waifu.",
    );
  }
}
