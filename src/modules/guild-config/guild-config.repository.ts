import { db } from "../../prisma/db";

export async function findGuildConfig(guildId: string) {
  return db.orm.public.GuildConfig.where({
    guildId,
  }).first();
}

export async function createGuildConfig(
  guildId: string,
  deliveryChannelId: string,
) {
  return db.orm.public.GuildConfig.create({
    guildId,
    deliveryChannelId,
  });
}

export async function updateGuildDeliveryChannel(
  guildId: string,
  deliveryChannelId: string,
) {
  return db.orm.public.GuildConfig.where({
    guildId,
  }).update({
    deliveryChannelId,
    updatedAt: new Date(),
  });
}