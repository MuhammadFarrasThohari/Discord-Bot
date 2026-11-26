import { SlashCommandBuilder } from "discord.js";

import type { BotCommand } from "../command.types";
import { handleWaifuCommand } from "./waifu.handler";

export const waifuCommand = new SlashCommandBuilder()
  .setName("waifu")
  .setDescription("Daily waifu commands")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("today")
      .setDescription("Get your daily waifu artwork"),
  );

export const waifuCommandDefinition: BotCommand = {
  data: waifuCommand,
  execute: handleWaifuCommand,
};
