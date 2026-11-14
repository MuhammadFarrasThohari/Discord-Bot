
import type {
  ChatInputCommandInteraction,
} from "discord.js";

import {
  addCharacterToUser,
  listUserCharacters,
  removeCharacterFromUser,
  setCharacterSchedule,
} from "../../modules/character/character.service";

import {
  characterAddSchema,
  characterTagSchema,
  characterScheduleSchema,
} from "../../modules/character/character.validation";

import {
  CharacterAlreadyExistsError,
  CharacterNotFoundError,
  CharacterNotInListError,
} from "../../modules/character/character.errors";

import {
  DanbooruTagNotFoundError,
  InvalidDanbooruTagError,
  DanbooruUnavailableError,
} from "../../integrations/danbooru/danbooru.service";

function getErrorMessage(error: unknown): string {
  if (error instanceof CharacterAlreadyExistsError) {
    return error.message;
  }

  if (
    error instanceof CharacterNotFoundError ||
    error instanceof CharacterNotInListError ||
    error instanceof DanbooruTagNotFoundError ||
    error instanceof InvalidDanbooruTagError ||
    error instanceof DanbooruUnavailableError
  ) {
    return error.message;
  }

  console.error("[CHARACTER] Unexpected error:", error);

  return "An unexpected error occurred. Please try again later.";
}

export async function handleCharacterCommand(
  interaction: ChatInputCommandInteraction,
) {
  const subcommand = interaction.options.getSubcommand();

  await interaction.deferReply({ ephemeral: true });

  try {
    if (subcommand === "add") {
      const input = characterAddSchema.safeParse({
        name: interaction.options.getString("name"),
        danbooruTag: interaction.options.getString("tag"),
      });

      if (!input.success) {
        return interaction.editReply(
          input.error.issues
            .map((issue) => `• ${issue.message}`)
            .join("\n"),
        );
      }

      const result = await addCharacterToUser(
        interaction.user.id,
        input.data.name,
        input.data.danbooruTag,
      );

      return interaction.editReply(
        result.reactivated
          ? `Reactivated **${result.character.name}**!`
          : `Added **${result.character.name}** to your character list!`,
      );
    }

    if (subcommand === "remove") {
      const input = characterTagSchema.safeParse({
        danbooruTag: interaction.options.getString("tag"),
      });

      if (!input.success) {
        return interaction.editReply(
          input.error.issues
            .map((issue) => `• ${issue.message}`)
            .join("\n"),
        );
      }

      const character = await removeCharacterFromUser(
        interaction.user.id,
        input.data.danbooruTag,
      );

      return interaction.editReply(
        `Removed **${character.name}** from your character list.`,
      );
    }

    if (subcommand === "list") {
      const characters = await listUserCharacters(
        interaction.user.id,
      );

      if (characters.length === 0) {
        return interaction.editReply(
          "Your character list is empty. Use `/character add` to add one!",
        );
      }

      const dayNames = [
        "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
      ];

      const lines = characters.map((character) => {
        const schedules = character.schedules
          .map((day) => dayNames[day])
          .join(", ");

        return (
          `• **${character.name}** (\`${character.danbooruTag}\`)\n` +
          `  Schedule: ${schedules || "Not scheduled"}`
        );
      });

      return interaction.editReply(
        `**Your Characters**\n\n${lines.join("\n")}`,
      );
    }

    if (subcommand === "schedule") {
      const input = characterScheduleSchema.safeParse({
        danbooruTag: interaction.options.getString("tag"),
        days: interaction.options.getString("days"),
      });

      if (!input.success) {
        return interaction.editReply(
          input.error.issues
            .map((issue) => `• ${issue.message}`)
            .join("\n"),
        );
      }

      const schedules = await setCharacterSchedule(
        interaction.user.id,
        input.data.danbooruTag,
        input.data.days.join(","),
      );

      return interaction.editReply(
        `Schedule updated successfully! **${schedules.length}** day(s) configured.`,
      );
    }

    return interaction.editReply("Unknown character command.");
  } catch (error) {
    return interaction.editReply(getErrorMessage(error));
  }
}
