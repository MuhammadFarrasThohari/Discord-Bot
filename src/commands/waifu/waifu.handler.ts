
import type { ChatInputCommandInteraction } from "discord.js";

import { deliverTodayArtwork } from "../../modules/delivery/delivery.service";

export async function handleWaifuCommand(
  interaction: ChatInputCommandInteraction,
) {
  const subcommand = interaction.options.getSubcommand();

  await interaction.deferReply({ ephemeral: true });

  try {
    if (subcommand === "today") {
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
              `You've already received your Daily Waifu today!\n\n` +
              `[Jump to your artwork](${result.messageUrl})`,
          });
          return;

        case "no-schedule":
          await interaction.editReply(
            "You don't have any character scheduled for today.",
          );
          return;

        case "no-artwork":
          await interaction.editReply(
            "Sorry, no suitable artwork was found for your scheduled characters today.",
          );
          return;

        case "delivered":
          await interaction.editReply(
            "Your Daily Waifu has been delivered to the configured channel!",
          );
          return;
      }
    }
  } catch (error) {
    console.error("[WAIFU] Command failed:", error);

    await interaction.editReply(
      "Something went wrong while processing your Daily Waifu request.",
    );
  }
}
