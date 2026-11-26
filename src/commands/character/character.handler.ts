import type { ChatInputCommandInteraction } from "discord.js";

import {
  addCharacterToUser,
  listUserCharacters,
  removeCharacterFromUser,
  setCharacterSchedule,
} from "../../modules/character/character.service";
import {
  characterAddSchema,
  characterScheduleSchema,
  characterTagSchema,
} from "../../modules/character/character.validation";
import { AppError } from "../../shared/errors/app-error";
import { DAY_NUMBER_TO_LABEL } from "../../shared/utils/date";
import { formatZodIssues } from "../../shared/utils/validation";

/**
 * Returns user-safe messages for expected `AppError` instances while masking
 * unexpected internal failures behind a generic prompt.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  console.error("[CHARACTER] Unexpected error:", error);

  return "An unexpected error occurred. Please try again later.";
}

async function handleAddSubcommand(interaction: ChatInputCommandInteraction) {
  const input = characterAddSchema.safeParse({
    name: interaction.options.getString("name"),
    danbooruTag: interaction.options.getString("tag"),
  });

  if (!input.success) {
    await interaction.editReply(formatZodIssues(input.error));
    return;
  }

  const result = await addCharacterToUser(
    interaction.user.id,
    input.data.name,
    input.data.danbooruTag,
  );

  await interaction.editReply(
    result.reactivated
      ? `Reactivated **${result.character.name}**!`
      : `Added **${result.character.name}** to your character list!`,
  );
}

async function handleRemoveSubcommand(
  interaction: ChatInputCommandInteraction,
) {
  const input = characterTagSchema.safeParse({
    danbooruTag: interaction.options.getString("tag"),
  });

  if (!input.success) {
    await interaction.editReply(formatZodIssues(input.error));
    return;
  }

  const character = await removeCharacterFromUser(
    interaction.user.id,
    input.data.danbooruTag,
  );

  await interaction.editReply(
    `Removed **${character.name}** from your character list.`,
  );
}

async function handleListSubcommand(interaction: ChatInputCommandInteraction) {
  const characters = await listUserCharacters(interaction.user.id);

  if (characters.length === 0) {
    await interaction.editReply(
      "Your character list is empty. Use `/character add` to add one!",
    );
    return;
  }

  const lines = characters.map((character) => {
    const schedules = character.schedules
      .map((day) => DAY_NUMBER_TO_LABEL[day])
      .filter(Boolean)
      .join(", ");

    return (
      `• **${character.name}** (\`${character.danbooruTag}\`)\n` +
      `  Schedule: ${schedules || "Not scheduled"}`
    );
  });

  await interaction.editReply(`**Your Characters**\n\n${lines.join("\n")}`);
}

async function handleScheduleSubcommand(
  interaction: ChatInputCommandInteraction,
) {
  const input = characterScheduleSchema.safeParse({
    danbooruTag: interaction.options.getString("tag"),
    days: interaction.options.getString("days"),
  });

  if (!input.success) {
    await interaction.editReply(formatZodIssues(input.error));
    return;
  }

  const schedules = await setCharacterSchedule(
    interaction.user.id,
    input.data.danbooruTag,
    input.data.days,
  );

  await interaction.editReply(
    `Schedule updated successfully! **${schedules.length}** day(s) configured.`,
  );
}

/**
 * Handles `/character` subcommands (`add`, `remove`, `list`, `schedule`).
 * Defers the reply ephemerally first because Danbooru validation and DB calls
 * can exceed Discord's 3-second initial response window.
 */
export async function handleCharacterCommand(
  interaction: ChatInputCommandInteraction,
) {
  const subcommand = interaction.options.getSubcommand();

  await interaction.deferReply({ ephemeral: true });

  try {
    switch (subcommand) {
      case "add":
        await handleAddSubcommand(interaction);
        return;

      case "remove":
        await handleRemoveSubcommand(interaction);
        return;

      case "list":
        await handleListSubcommand(interaction);
        return;

      case "schedule":
        await handleScheduleSubcommand(interaction);
        return;

      default:
        await interaction.editReply("Unknown character command.");
    }
  } catch (error) {
    await interaction.editReply(getErrorMessage(error));
  }
}
