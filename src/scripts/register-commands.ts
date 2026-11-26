import "dotenv/config";

import { REST, Routes } from "discord.js";

import { commands } from "../commands";
import { getRegisterCommandsEnv } from "../config/env";

const {
  DISCORD_TOKEN: token,
  DISCORD_CLIENT_ID: clientId,
  DISCORD_GUILD_ID: guildId,
} = getRegisterCommandsEnv();

const rest = new REST({ version: "10" }).setToken(token);

async function registerCommands() {
  try {
    console.log("[DISCORD] Registering slash commands...");

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands.map((command) => command.data.toJSON()),
    });

    console.log("[DISCORD] Slash commands registered.");
  } catch (error) {
    console.error("[DISCORD] Failed to register commands:", error);

    process.exitCode = 1;
  }
}

registerCommands();
