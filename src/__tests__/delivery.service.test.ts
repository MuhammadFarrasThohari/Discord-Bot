import type { Client } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as danbooruService from "../integrations/danbooru/danbooru.service";
import * as artworkRepository from "../modules/artwork/artwork.repository";
import * as deliveryChannel from "../modules/delivery/delivery.channel";
import * as deliveryRepository from "../modules/delivery/delivery.repository";
import {
  deliverDailyArtworks,
  deliverTodayArtwork,
} from "../modules/delivery/delivery.service";

vi.mock("../integrations/danbooru/danbooru.service");
vi.mock("../modules/artwork/artwork.repository");
vi.mock("../modules/delivery/delivery.channel");
vi.mock("../modules/delivery/delivery.repository");

const mockClient = {} as Client;

function createMockPost(id: number, tagString: string) {
  return {
    id,
    created_at: "2026-11-26T00:00:00.000Z",
    file_url: `https://example.com/${id}.png`,
    preview_file_url: null,
    large_file_url: null,
    source: "https://example.com",
    rating: "g",
    image_width: 1000,
    image_height: 1000,
    file_ext: "png",
    file_size: 1024,
    score: 50,
    fav_count: 10,
    tag_string: tagString,
    is_deleted: false,
    is_pending: false,
  };
}

describe("delivery service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns already-delivered when all scheduled characters were already delivered today", async () => {
    vi.mocked(
      deliveryRepository.findActiveDiscordUserByDiscordId,
    ).mockResolvedValue({
      id: 1,
      discordId: "discord-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(
      deliveryRepository.getScheduledCharactersForUser,
    ).mockResolvedValue({
      userId: 1,
      discordId: "discord-1",
      characters: [
        { id: 20, name: "Furina", danbooruTag: "furina_(genshin_impact)" },
      ],
    });
    vi.mocked(deliveryRepository.getUserDeliveriesForDate).mockResolvedValue([
      {
        id: 99,
        userId: 1,
        characterId: 20,
        artworkId: 50,
        channelId: "chan-1",
        messageId: "msg-1",
        deliveredAt: new Date(),
      },
    ]);

    const result = await deliverTodayArtwork(
      mockClient,
      "discord-1",
      "guild-1",
    );

    expect(result).toEqual({
      status: "already-delivered",
      messageUrl: "https://discord.com/channels/guild-1/chan-1/msg-1",
    });
  });

  it("delivers only characters not yet received today when user received partial deliveries", async () => {
    const sendMock = vi.fn().mockResolvedValue({
      id: "sent-msg-2",
      channel: { id: "chan-1" },
    });

    vi.mocked(deliveryChannel.getConfiguredDeliveryChannel).mockResolvedValue({
      send: sendMock,
    } as never);
    vi.mocked(
      deliveryRepository.findActiveDiscordUserByDiscordId,
    ).mockResolvedValue({
      id: 1,
      discordId: "discord-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(
      deliveryRepository.getScheduledCharactersForUser,
    ).mockResolvedValue({
      userId: 1,
      discordId: "discord-1",
      characters: [
        { id: 20, name: "Furina", danbooruTag: "furina_(genshin_impact)" },
        { id: 21, name: "Hu Tao", danbooruTag: "hu_tao_(genshin_impact)" },
      ],
    });
    vi.mocked(deliveryRepository.getUserDeliveriesForDate).mockResolvedValue([
      {
        id: 99,
        userId: 1,
        characterId: 20,
        artworkId: 50,
        channelId: "chan-1",
        messageId: "msg-1",
        deliveredAt: new Date(),
      },
    ]);
    vi.mocked(danbooruService.fetchSfwArtworks).mockResolvedValue([
      createMockPost(22222, "hu_tao_(genshin_impact) solo"),
    ]);
    vi.mocked(artworkRepository.findArtworkBySourceId).mockResolvedValue({
      id: 501,
      source: "danbooru",
      sourceId: "22222",
      title: null,
      fileUrl: "https://example.com/22222.png",
      previewUrl: null,
      sampleUrl: null,
      rating: "g",
      fileExt: "png",
      fileSize: 1024,
      score: 50,
      favoriteCount: 10,
      tagString: "hu_tao_(genshin_impact) solo",
      isDeleted: false,
      isPending: false,
      sourceCreatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(deliveryRepository.hasUserReceivedArtwork).mockResolvedValue(
      false,
    );

    const result = await deliverTodayArtwork(
      mockClient,
      "discord-1",
      "guild-1",
    );

    expect(result).toEqual({
      status: "delivered",
      deliveredCharacters: ["Hu Tao"],
    });
    expect(danbooruService.fetchSfwArtworks).toHaveBeenCalledTimes(1);
    expect(danbooruService.fetchSfwArtworks).toHaveBeenCalledWith({
      tags: ["hu_tao_(genshin_impact)"],
      page: 1,
    });
    expect(deliveryRepository.createDeliveryHistory).toHaveBeenCalledWith({
      userId: 1,
      characterId: 21,
      artworkId: 501,
      channelId: "chan-1",
      messageId: "sent-msg-2",
    });
  });

  it("handles legacy delivery rows without characterId via tagString fallback", async () => {
    const sendMock = vi.fn().mockResolvedValue({
      id: "sent-msg-3",
      channel: { id: "chan-1" },
    });

    vi.mocked(deliveryChannel.getConfiguredDeliveryChannel).mockResolvedValue({
      send: sendMock,
    } as never);
    vi.mocked(
      deliveryRepository.findActiveDiscordUserByDiscordId,
    ).mockResolvedValue({
      id: 1,
      discordId: "discord-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(
      deliveryRepository.getScheduledCharactersForUser,
    ).mockResolvedValue({
      userId: 1,
      discordId: "discord-1",
      characters: [
        { id: 20, name: "Furina", danbooruTag: "furina_(genshin_impact)" },
        { id: 21, name: "Hu Tao", danbooruTag: "hu_tao_(genshin_impact)" },
      ],
    });
    vi.mocked(deliveryRepository.getUserDeliveriesForDate).mockResolvedValue([
      {
        id: 98,
        userId: 1,
        characterId: null,
        artworkId: 500,
        channelId: "chan-1",
        messageId: "msg-0",
        deliveredAt: new Date(),
      },
    ]);
    vi.mocked(artworkRepository.findArtworkById).mockResolvedValue({
      id: 500,
      source: "danbooru",
      sourceId: "12345",
      title: null,
      fileUrl: "https://example.com/12345.png",
      previewUrl: null,
      sampleUrl: null,
      rating: "g",
      fileExt: "png",
      fileSize: 1024,
      score: 50,
      favoriteCount: 10,
      tagString: "1girl furina_(genshin_impact) solo",
      isDeleted: false,
      isPending: false,
      sourceCreatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(danbooruService.fetchSfwArtworks).mockResolvedValue([
      createMockPost(22222, "hu_tao_(genshin_impact) solo"),
    ]);
    vi.mocked(artworkRepository.findArtworkBySourceId).mockResolvedValue({
      id: 501,
      source: "danbooru",
      sourceId: "22222",
      title: null,
      fileUrl: "https://example.com/22222.png",
      previewUrl: null,
      sampleUrl: null,
      rating: "g",
      fileExt: "png",
      fileSize: 1024,
      score: 50,
      favoriteCount: 10,
      tagString: "hu_tao_(genshin_impact) solo",
      isDeleted: false,
      isPending: false,
      sourceCreatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(deliveryRepository.hasUserReceivedArtwork).mockResolvedValue(
      false,
    );

    const result = await deliverTodayArtwork(
      mockClient,
      "discord-1",
      "guild-1",
    );

    expect(result).toEqual({
      status: "delivered",
      deliveredCharacters: ["Hu Tao"],
    });
  });

  it("returns no-schedule when user has no characters scheduled today", async () => {
    vi.mocked(
      deliveryRepository.findActiveDiscordUserByDiscordId,
    ).mockResolvedValue({
      id: 1,
      discordId: "discord-1",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(
      deliveryRepository.getScheduledCharactersForUser,
    ).mockResolvedValue({
      userId: 1,
      discordId: "discord-1",
      characters: [],
    });

    const result = await deliverTodayArtwork(
      mockClient,
      "discord-1",
      "guild-1",
    );

    expect(result).toEqual({ status: "no-schedule" });
  });

  it("skips users whose scheduled characters were all already delivered today during batch run", async () => {
    vi.mocked(deliveryChannel.getConfiguredDeliveryChannel).mockResolvedValue({
      send: vi.fn(),
    } as never);
    vi.mocked(deliveryRepository.getScheduledCharactersForDay).mockResolvedValue([
      {
        userId: 1,
        discordId: "discord-1",
        characters: [
          { id: 20, name: "Furina", danbooruTag: "furina_(genshin_impact)" },
        ],
      },
    ]);
    vi.mocked(deliveryRepository.getUserDeliveriesForDate).mockResolvedValue([
      {
        id: 99,
        userId: 1,
        characterId: 20,
        artworkId: 50,
        channelId: "chan-1",
        messageId: "msg-1",
        deliveredAt: new Date(),
      },
    ]);

    const summary = await deliverDailyArtworks(mockClient);

    expect(summary).toEqual({
      total: 1,
      success: 0,
      failed: 0,
      skipped: 1,
    });
  });
});
