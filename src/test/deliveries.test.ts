import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChannelType, type Client } from "discord.js";

vi.mock("../guild-config/guild-config.service", () => ({
  getDeliveryChannel: vi.fn(),
}));
vi.mock("../../prisma/db", () => ({ db: { orm: {} } }));
vi.mock("./delivery.repository", () => ({
  getScheduledCharactersForDay: vi.fn(),
  findArtworkBySourceId: vi.fn(),
  hasUserReceivedArtwork: vi.fn(),
  createDeliveryHistory: vi.fn(),
  getScheduledCharactersForUser: vi.fn(),
  getUserDeliveryForDate: vi.fn(),
}));
vi.mock("../../integrations/danbooru/danbooru.service", () => ({
  fetchSfwArtworks: vi.fn(),
}));
vi.mock("../artwork/artwork.repository", () => ({
  saveDanbooruArtwork: vi.fn(),
}));

import { deliverDailyArtworks } from "../modules/delivery/delivery.service";
import { getDeliveryChannel } from "../modules/guild-config/guild-config.service";
import {
  getScheduledCharactersForDay,
  findArtworkBySourceId,
  hasUserReceivedArtwork,
  createDeliveryHistory,
  getUserDeliveryForDate,
} from "../modules/delivery/delivery.repository";
import { fetchSfwArtworks } from "../integrations/danbooru/danbooru.service";
import { saveDanbooruArtwork } from "../modules/artwork/artwork.repository";

const GUILD_ID = "guild-1";

// ---------- helpers ----------
const makeTarget = (userId: number, discordId: string, tags: string[]) => ({
  userId,
  discordId,
  characters: tags.map((tag, i) => ({
    id: i + 1,
    name: tag.toUpperCase(),
    danbooruTag: tag,
  })),
});

const makePost = (id: number, file_url: string | null = `https://img/${id}.png`) => ({
  id,
  file_url,
});

function makeClient() {
  let n = 0;
  const send = vi.fn().mockImplementation(async () => ({
    id: `msg-${++n}`,
    channel: { id: "chan-1" },
  }));

  const client = {
    channels: {
      fetch: vi.fn().mockResolvedValue({
        guildId: GUILD_ID,
        isThread: () => false,
        type: ChannelType.GuildText,
        send,
      }),
    },
  } as unknown as Client;

  return { client, send };
}

function mockPosts(postsByTag: Record<string, ReturnType<typeof makePost>[]>) {
  vi.mocked(fetchSfwArtworks).mockImplementation((async ({ tags }: any) =>
    postsByTag[tags[0]] ?? []) as never);
}

// ---------- tests ----------
describe("deliverDailyArtworks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Senin, 16 Nov 2026 10:00 WIB -> dayOfWeek = 1
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T03:00:00Z"));

    process.env.DISCORD_GUILD_ID = GUILD_ID;

    vi.mocked(getDeliveryChannel).mockResolvedValue({
      deliveryChannelId: "chan-1",
    } as never);
    vi.mocked(getUserDeliveryForDate).mockResolvedValue(null as never);
    vi.mocked(hasUserReceivedArtwork).mockResolvedValue(false);
    vi.mocked(findArtworkBySourceId).mockImplementation((async (id: string) => ({
      id: Number(id),
    })) as never);
    vi.mocked(createDeliveryHistory).mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("ambil jadwal berdasarkan hari Jakarta", async () => {
    vi.mocked(getScheduledCharactersForDay).mockResolvedValue([]);
    const { client } = makeClient();

    await deliverDailyArtworks(client);

    expect(getScheduledCharactersForDay).toHaveBeenCalledWith(1);
  });

  it("kirim 1 artwork per karakter dan simpan delivery history", async () => {
    vi.mocked(getScheduledCharactersForDay).mockResolvedValue([
      makeTarget(1, "discord-1", ["rem", "emilia"]),
    ] as never);
    mockPosts({ rem: [makePost(10)], emilia: [makePost(20)] });
    const { client, send } = makeClient();

    const result = await deliverDailyArtworks(client);

    expect(result).toEqual({ total: 1, success: 1, failed: 0, skipped: 0 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "✨ Daily Waifu for <@discord-1>!",
        allowedMentions: { users: ["discord-1"] },
      }),
    );
    expect(createDeliveryHistory).toHaveBeenCalledTimes(2);
    expect(createDeliveryHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        artworkId: expect.any(Number),
        channelId: "chan-1",
        messageId: expect.stringMatching(/^msg-/),
      }),
    );
  });

  it("proses semua user yang terjadwal", async () => {
    vi.mocked(getScheduledCharactersForDay).mockResolvedValue([
      makeTarget(1, "discord-1", ["rem"]),
      makeTarget(2, "discord-2", ["emilia"]),
    ] as never);
    mockPosts({ rem: [makePost(10)], emilia: [makePost(20)] });
    const { client, send } = makeClient();

    const result = await deliverDailyArtworks(client);

    expect(result).toEqual({ total: 2, success: 2, failed: 0, skipped: 0 });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("skip user yang sudah dapat delivery hari ini", async () => {
    vi.mocked(getScheduledCharactersForDay).mockResolvedValue([
      makeTarget(1, "discord-1", ["rem"]),
    ] as never);
    vi.mocked(getUserDeliveryForDate).mockResolvedValue({
      channelId: "chan-1",
      messageId: "old",
    } as never);
    const { client, send } = makeClient();

    const result = await deliverDailyArtworks(client);

    expect(result).toEqual({ total: 1, success: 0, failed: 0, skipped: 1 });
    expect(fetchSfwArtworks).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("skip artwork yang sudah pernah diterima user, pakai kandidat lain", async () => {
    vi.mocked(getScheduledCharactersForDay).mockResolvedValue([
      makeTarget(1, "discord-1", ["rem"]),
    ] as never);
    mockPosts({ rem: [makePost(1), makePost(2)] });
    vi.mocked(hasUserReceivedArtwork).mockImplementation(
      (async (_u: number, artworkId: number) => artworkId === 1) as never,
    );
    const { client, send } = makeClient();

    await deliverDailyArtworks(client);

    expect(send).toHaveBeenCalledTimes(1);
    expect(createDeliveryHistory).toHaveBeenCalledWith(
      expect.objectContaining({ artworkId: 2 }),
    );
  });

  it("skip post tanpa file_url", async () => {
    vi.mocked(getScheduledCharactersForDay).mockResolvedValue([
      makeTarget(1, "discord-1", ["rem"]),
    ] as never);
    mockPosts({ rem: [makePost(1, null), makePost(2)] });
    const { client } = makeClient();

    await deliverDailyArtworks(client);

    expect(createDeliveryHistory).toHaveBeenCalledTimes(1);
    expect(createDeliveryHistory).toHaveBeenCalledWith(
      expect.objectContaining({ artworkId: 2 }),
    );
  });

  it("simpan artwork baru ke DB kalau belum ada", async () => {
    vi.mocked(getScheduledCharactersForDay).mockResolvedValue([
      makeTarget(1, "discord-1", ["rem"]),
    ] as never);
    mockPosts({ rem: [makePost(99)] });
    vi.mocked(findArtworkBySourceId).mockResolvedValue(null as never);
    vi.mocked(saveDanbooruArtwork).mockResolvedValue({ id: 555 } as never);
    const { client } = makeClient();

    await deliverDailyArtworks(client);

    expect(findArtworkBySourceId).toHaveBeenCalledWith("99");
    expect(saveDanbooruArtwork).toHaveBeenCalledWith(
      expect.objectContaining({ id: 99 }),
    );
    expect(createDeliveryHistory).toHaveBeenCalledWith(
      expect.objectContaining({ artworkId: 555 }),
    );
  });

  it("lanjut ke karakter berikutnya kalau fetch Danbooru gagal", async () => {
    vi.mocked(getScheduledCharactersForDay).mockResolvedValue([
      makeTarget(1, "discord-1", ["rem", "emilia"]),
    ] as never);
    vi.mocked(fetchSfwArtworks).mockImplementation((async ({ tags }: any) => {
      if (tags[0] === "rem") throw new Error("Danbooru down");
      return [makePost(20)];
    }) as never);
    const { client, send } = makeClient();

    const result = await deliverDailyArtworks(client);

    expect(result.success).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("hitung skipped kalau tidak ada artwork yang bisa dikirim", async () => {
    vi.mocked(getScheduledCharactersForDay).mockResolvedValue([
      makeTarget(1, "discord-1", ["rem"]),
    ] as never);
    mockPosts({ rem: [] });
    const { client, send } = makeClient();

    const result = await deliverDailyArtworks(client);

    expect(result).toEqual({ total: 1, success: 0, failed: 0, skipped: 1 });
    expect(send).not.toHaveBeenCalled();
  });

  it("error di satu user tidak menghentikan user lain", async () => {
    vi.mocked(getScheduledCharactersForDay).mockResolvedValue([
      makeTarget(1, "discord-1", ["rem"]),
      makeTarget(2, "discord-2", ["emilia"]),
    ] as never);
    mockPosts({ rem: [makePost(10)], emilia: [makePost(20)] });
    vi.mocked(getUserDeliveryForDate).mockImplementation((async (userId: number) => {
      if (userId === 1) throw new Error("DB error");
      return null;
    }) as never);
    const { client, send } = makeClient();

    const result = await deliverDailyArtworks(client);

    expect(result).toEqual({ total: 2, success: 1, failed: 1, skipped: 0 });
    expect(send).toHaveBeenCalledTimes(1);
  });

  describe("konfigurasi channel", () => {
    it("throw kalau DISCORD_GUILD_ID tidak di-set", async () => {
      delete process.env.DISCORD_GUILD_ID;
      const { client } = makeClient();

      await expect(deliverDailyArtworks(client)).rejects.toThrow(
        "DISCORD_GUILD_ID is not configured.",
      );
    });

    it("throw kalau delivery channel belum dikonfigurasi", async () => {
      vi.mocked(getDeliveryChannel).mockResolvedValue(null as never);
      const { client } = makeClient();

      await expect(deliverDailyArtworks(client)).rejects.toThrow(
        /has not been configured/,
      );
      expect(getScheduledCharactersForDay).not.toHaveBeenCalled();
    });

    it("throw kalau channel beda guild", async () => {
      const { client } = makeClient();
      vi.mocked(client.channels.fetch).mockResolvedValue({
        guildId: "other-guild",
        isThread: () => false,
        type: ChannelType.GuildText,
      } as never);

      await expect(deliverDailyArtworks(client)).rejects.toThrow(
        /invalid or no longer accessible/,
      );
    });
  });
});