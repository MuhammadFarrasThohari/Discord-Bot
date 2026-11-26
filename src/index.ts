import "dotenv/config";

import { Client, Events, GatewayIntentBits } from "discord.js";

import { getBotEnv } from "./config/env";
import { registerInteractionEvents } from "./events/interaction-create.event";
import { startArtworkJob } from "./jobs/artwork-collector.job";

const { DISCORD_TOKEN } = getBotEnv();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

registerInteractionEvents(client);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot is online: ${readyClient.user.tag}`);
  startArtworkJob(client);
});

client.login(DISCORD_TOKEN);
