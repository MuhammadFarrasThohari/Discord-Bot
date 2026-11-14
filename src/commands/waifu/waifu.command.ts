
import { SlashCommandBuilder } from "discord.js";

export const waifuCommand = new SlashCommandBuilder()
  .setName("waifu")
  .setDescription("Daily waifu commands")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("today")
      .setDescription("Get your daily waifu artwork"),
  );
