
import {
  SlashCommandBuilder,
} from "discord.js";

export const characterCommand = new SlashCommandBuilder()
  .setName("character")
  .setDescription("Manage your waifu characters")

  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Add a character to your list")
      .addStringOption((option) =>
        option
          .setName("name")
          .setDescription("Character display name")
          .setRequired(true)
          .setMaxLength(80),
      )
      .addStringOption((option) =>
        option
          .setName("tag")
          .setDescription("Danbooru tag, e.g. furina_(genshin_impact)")
          .setRequired(true)
          .setMaxLength(100),
      ),
  )

  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Remove a character from your list")
      .addStringOption((option) =>
        option
          .setName("tag")
          .setDescription("Danbooru tag")
          .setRequired(true),
      ),
  )

  .addSubcommand((subcommand) =>
    subcommand
      .setName("list")
      .setDescription("Show your character list"),
  )

  .addSubcommand((subcommand) =>
    subcommand
      .setName("schedule")
      .setDescription("Set character delivery days")
      .addStringOption((option) =>
        option
          .setName("tag")
          .setDescription("Danbooru tag")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("days")
          .setDescription("Days: mon,tue,wed,thu,fri,sat,sun")
          .setRequired(true),
      ),
  );
