import { EmbedBuilder } from "discord.js";

export function buildWaifuEmbed(
  characterName: string,
  postId: number,
  fileUrl: string,
) {
  return new EmbedBuilder()
    .setColor(0x9324b6)
    .setTitle(characterName)
    .setURL(`https://danbooru.donmai.us/posts/${postId}`)
    .setImage(fileUrl)
    .setFooter({
      text: "Daily Waifu • Danbooru",
    });
}

export function createWaifuMessagePayload(
  discordId: string,
  characterName: string,
  postId: number,
  fileUrl: string,
) {
  return {
    content: `✨ Daily Waifu for <@${discordId}>!`,
    embeds: [buildWaifuEmbed(characterName, postId, fileUrl)],
    allowedMentions: {
      users: [discordId],
    },
  };
}

export function createMessageUrl(
  guildId: string,
  channelId: string,
  messageId: string,
): string {
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}
