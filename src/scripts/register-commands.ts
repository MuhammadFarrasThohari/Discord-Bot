
import "dotenv/config";

import { REST, Routes } from "discord.js";
import { commands } from "../commands";

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;
const guildId = process.env.DISCORD_GUILD_ID!;

const rest = new REST({ version: "10" }).setToken(token);

async function registerCommands() {
  try {
    console.log("[DISCORD] Registering slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      {
        body: commands.map((command) => command.toJSON()),
      },
    );

    console.log("[DISCORD] Slash commands registered.");
  } catch (error) {
    console.error(
      "[DISCORD] Failed to register commands:",
      error,
    );

    process.exitCode = 1;
  }
}

registerCommands();
