import { Events, type Client, type Interaction } from "discord.js";

import { commandMap } from "../commands";

/**
 * Registers the central Discord `InteractionCreate` listener and dispatches
 * slash commands via `commandMap`. Includes a safe fallback error reply that
 * respects whether the interaction was already deferred or replied to.
 */
export function registerInteractionEvents(client: Client) {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commandMap.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error("[DISCORD] Interaction error:", error);

      const fallbackMessage = "An unexpected error occurred.";

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(fallbackMessage);
      } else {
        await interaction.reply({
          content: fallbackMessage,
          ephemeral: true,
        });
      }
    }
  });
}
