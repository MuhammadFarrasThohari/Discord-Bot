import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

import { formatWeekdayNumbers } from "../../shared/utils/date";

export const CHARACTER_LIST_PAGE_SIZE = 10;
export const CHARACTER_LIST_PREV_BUTTON_ID = "character_list:prev";
export const CHARACTER_LIST_NEXT_BUTTON_ID = "character_list:next";

export interface CharacterListEntry {
  name: string;
  danbooruTag: string;
  schedules: number[];
}

/**
 * Builds a single paginated Discord Embed page for `/character list`, displaying
 * up to `CHARACTER_LIST_PAGE_SIZE` characters with Monday-first weekday labels.
 */
export function buildCharacterListEmbed(
  characters: readonly CharacterListEntry[],
  page: number,
  totalPages: number,
): EmbedBuilder {
  const startIndex = page * CHARACTER_LIST_PAGE_SIZE;
  const pageItems = characters.slice(
    startIndex,
    startIndex + CHARACTER_LIST_PAGE_SIZE,
  );

  const embed = new EmbedBuilder()
    .setColor(0x9324b6)
    .setTitle("Your Characters")
    .setFooter({
      text: `Page ${page + 1} of ${totalPages} • ${characters.length} character(s)`,
    });

  const fields = pageItems.map((character, offset) => {
    const scheduleText = formatWeekdayNumbers(character.schedules) || "Not scheduled";

    return {
      name: `${startIndex + offset + 1}. ${character.name}`,
      value: `Tag: \`${character.danbooruTag}\`\nSchedule: **${scheduleText}**`,
    };
  });

  embed.addFields(fields);

  return embed;
}

/**
 * Builds Previous/Next navigation buttons for paginated `/character list` replies.
 */
export function buildCharacterListPaginationRow(
  page: number,
  totalPages: number,
  disabled = false,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CHARACTER_LIST_PREV_BUTTON_ID)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page <= 0),
    new ButtonBuilder()
      .setCustomId(CHARACTER_LIST_NEXT_BUTTON_ID)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page >= totalPages - 1),
  );
}
