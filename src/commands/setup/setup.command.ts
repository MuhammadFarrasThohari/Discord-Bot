import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { BotCommand } from "../command.types";
import { handleSetupCommand } from "./setup.handler";

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

export const setupCommandDefinition: BotCommand = {
  data: setupCommand,
  execute: handleSetupCommand,
};
