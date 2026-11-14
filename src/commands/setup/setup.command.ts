import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";

export const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Configure Daily Waifu delivery channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption((option) =>
    option
      .setName("channel")
      .setDescription("Channel or thread for daily artwork delivery")
      .addChannelTypes(
        ChannelType.GuildText,
        ChannelType.PublicThread,
        ChannelType.PrivateThread,
        ChannelType.AnnouncementThread,
      )
      .setRequired(true),
  );
