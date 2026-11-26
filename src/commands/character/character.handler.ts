import {
  type ChatInputCommandInteraction,
  ComponentType,
} from "discord.js";

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
import { formatWeekdayNumbers } from "../../shared/utils/date";
import { formatZodIssues } from "../../shared/utils/validation";
import {
  buildCharacterListEmbed,
  buildCharacterListPaginationRow,
  CHARACTER_LIST_NEXT_BUTTON_ID,
  CHARACTER_LIST_PAGE_SIZE,
  CHARACTER_LIST_PREV_BUTTON_ID,
} from "./character.list.embed";

const PAGINATION_TIMEOUT_MS = 120_000;

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
    days: interaction.options.getString("days"),
  });

  if (!input.success) {
    await interaction.editReply(formatZodIssues(input.error));
    return;
  }

  const result = await addCharacterToUser(
    interaction.user.id,
    input.data.name,
    input.data.danbooruTag,
    input.data.days,
  );

  const scheduleSummary = formatWeekdayNumbers(
    result.schedules.map((schedule) => schedule.dayOfWeek),
  );

  await interaction.editReply(
    result.reactivated
      ? `Reactivated **${result.character.name}** with schedule: **${scheduleSummary}**!`
      : `Added **${result.character.name}** to your character list with schedule: **${scheduleSummary}**!`,
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

/**
 * Renders the user's sorted character list inside a Discord Embed with interactive
 * Previous/Next pagination when the list exceeds `CHARACTER_LIST_PAGE_SIZE`.
 */
async function handleListSubcommand(interaction: ChatInputCommandInteraction) {
  const characters = await listUserCharacters(interaction.user.id);

  if (characters.length === 0) {
    await interaction.editReply(
      "Your character list is empty. Use `/character add` to add one!",
    );
    return;
  }

  const totalPages = Math.ceil(characters.length / CHARACTER_LIST_PAGE_SIZE);
  let currentPage = 0;

  if (totalPages <= 1) {
    await interaction.editReply({
      embeds: [buildCharacterListEmbed(characters, currentPage, totalPages)],
    });
    return;
  }

  const reply = await interaction.editReply({
    embeds: [buildCharacterListEmbed(characters, currentPage, totalPages)],
    components: [buildCharacterListPaginationRow(currentPage, totalPages)],
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: PAGINATION_TIMEOUT_MS,
  });

  collector.on("collect", async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      await buttonInteraction.reply({
        content: "You cannot control another user's character list.",
        ephemeral: true,
      });
      return;
    }

    if (buttonInteraction.customId === CHARACTER_LIST_PREV_BUTTON_ID) {
      currentPage = Math.max(0, currentPage - 1);
    } else if (buttonInteraction.customId === CHARACTER_LIST_NEXT_BUTTON_ID) {
      currentPage = Math.min(totalPages - 1, currentPage + 1);
    }

    await buttonInteraction.update({
      embeds: [buildCharacterListEmbed(characters, currentPage, totalPages)],
      components: [buildCharacterListPaginationRow(currentPage, totalPages)],
    });
  });

  collector.on("end", async () => {
    try {
      await interaction.editReply({
        components: [
          buildCharacterListPaginationRow(currentPage, totalPages, true),
        ],
      });
    } catch {
      // Ignore failures when the ephemeral interaction token or message expired.
    }
  });
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

  const scheduleSummary = formatWeekdayNumbers(
    schedules.map((schedule) => schedule.dayOfWeek),
  );

  await interaction.editReply(
    `Schedule updated successfully! **${schedules.length}** day(s) configured: **${scheduleSummary}**.`,
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
