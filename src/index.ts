import "dotenv/config";

import { Client, Events, GatewayIntentBits } from "discord.js";

import { getBotEnv } from "./config/env";
import { registerInteractionEvents } from "./events/interaction-create.event";
import { startArtworkJob } from "./jobs/artwork-collector.job";
import { runStartupChecks } from "./check/systemCheck";

async function main() {
  const { DISCORD_TOKEN } = getBotEnv();

  await runStartupChecks();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  registerInteractionEvents(client);

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Bot is online: ${readyClient.user.tag}`);
    startArtworkJob(client);
  });

  await client.login(DISCORD_TOKEN);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
