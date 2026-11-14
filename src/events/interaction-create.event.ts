import { Events, type Client, type Interaction } from "discord.js";

import { handleCharacterCommand } from "../commands/character/character.handler";
import { handleSetupCommand } from "../commands/setup/setup.handler";
import { handleWaifuCommand } from "../commands/waifu/waifu.handler";

export function registerInteractionEvents(client: Client) {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
      switch (interaction.commandName) {
        case "character":
          await handleCharacterCommand(interaction);
          break;

        case "setup":
          await handleSetupCommand(interaction);
          break;

        case "waifu":
          await handleWaifuCommand(interaction);
          break;

        // Command lainnya bisa ditambahkan di sini.
      }
    } catch (error) {
      console.error("[DISCORD] Interaction error:", error);

      const reply = {
        content: "An unexpected error occurred.",
        ephemeral: true,
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply.content);
      } else {
        await interaction.reply(reply);
      }
    }
  });
}
