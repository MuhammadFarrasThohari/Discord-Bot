import {
  createGuildConfig,
  findGuildConfig,
  updateGuildDeliveryChannel,
} from "./guild-config.repository";

/**
 * Creates or updates the configured delivery destination channel/thread for a guild.
 */
export async function setDeliveryChannel(guildId: string, channelId: string) {
  const existing = await findGuildConfig(guildId);

  if (existing) {
    await updateGuildDeliveryChannel(guildId, channelId);

    return {
      created: false,
      guildId,
      channelId,
    };
  }

  await createGuildConfig(guildId, channelId);

  return {
    created: true,
    guildId,
    channelId,
  };
}

export async function getDeliveryChannel(guildId: string) {
  return findGuildConfig(guildId);
}
