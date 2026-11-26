import type { ChatInputCommandInteraction } from "discord.js";

import { deliverTodayArtwork } from "../../modules/delivery/delivery.service";
import { AppError } from "../../shared/errors/app-error";

export async function handleWaifuCommand(
  interaction: ChatInputCommandInteraction,
) {
  const subcommand = interaction.options.getSubcommand();

  await interaction.deferReply({ ephemeral: true });

  try {
    if (subcommand !== "today") {
      await interaction.editReply("Unknown waifu command.");
      return;
    }

    if (!interaction.guildId) {
      await interaction.editReply(
        "This command can only be used inside a server.",
      );
      return;
    }

    const result = await deliverTodayArtwork(
      interaction.client,
      interaction.user.id,
      interaction.guildId,
    );

    switch (result.status) {
      case "already-delivered":
        await interaction.editReply({
          content:
            `You've already received all of your Daily Waifu characters for today!\n\n` +
            `[Jump to your latest artwork](${result.messageUrl})`,
        });
        return;

      case "no-schedule":
        await interaction.editReply(
          "You don't have any character scheduled for today.",
        );
        return;

      case "no-artwork":
        await interaction.editReply(
          "Sorry, no suitable artwork was found for your remaining scheduled characters today.",
        );
        return;

      case "delivered": {
        const names = result.deliveredCharacters
          .map((name) => `**${name}**`)
          .join(", ");

        await interaction.editReply(
          `Your Daily Waifu (${names}) has been delivered to the configured channel!`,
        );
        return;
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      await interaction.editReply(error.message);
      return;
    }

    console.error("[WAIFU] Command failed:", error);

    await interaction.editReply(
      "Something went wrong while processing your Daily Waifu request.",
    );
  }
}
