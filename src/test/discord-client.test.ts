import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
const token = process.env.DISCORD_TOKEN;

export async function clientLogin() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Bot is online: ${readyClient.user.tag}`);
  });

  client.login(token);
  return client;
}
