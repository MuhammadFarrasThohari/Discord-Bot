import "dotenv/config";
import { startArtworkJob } from "./jobs/artwork-collector.job";

import { Client, Events, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { registerInteractionEvents } from "./events/interaction-create.event";

import { waifuCommand } from "./commands/waifu/waifu.command.js";

const token = process.env.DISCORD_TOKEN;

if (!token) {
  throw new Error("DISCORD_TOKEN is not defined");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

registerInteractionEvents(client);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot is online: ${readyClient.user.tag}`);
  startArtworkJob(client);
});



client.login(token);
