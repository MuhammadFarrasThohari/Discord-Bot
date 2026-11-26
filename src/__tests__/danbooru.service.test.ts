import { beforeEach, describe, expect, it, vi } from "vitest";

import * as danbooruClient from "../integrations/danbooru/danbooru.client";
import { fetchSfwArtworks } from "../integrations/danbooru/danbooru.service";

vi.mock("../integrations/danbooru/danbooru.client");

describe("danbooru service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries with rating:g and solo and filters out unsafe or incomplete posts", async () => {
    vi.mocked(danbooruClient.getDanbooruPosts).mockResolvedValue([
      {
        id: 1,
        created_at: "2026-11-26T00:00:00.000Z",
        file_url: "https://example.com/valid.png",
        preview_file_url: null,
        large_file_url: null,
        source: "",
        rating: "g",
        image_width: 800,
        image_height: 800,
        file_ext: "png",
        file_size: 1000,
        score: 10,
        fav_count: 5,
        tag_string: "furina_(genshin_impact) solo",
        is_deleted: false,
        is_pending: false,
      },
      {
        id: 2,
        created_at: "2026-11-26T00:00:00.000Z",
        file_url: null,
        preview_file_url: null,
        large_file_url: null,
        source: "",
        rating: "g",
        image_width: 800,
        image_height: 800,
        file_ext: "png",
        file_size: 1000,
        score: 10,
        fav_count: 5,
        tag_string: "furina_(genshin_impact) solo",
        is_deleted: false,
        is_pending: false,
      },
      {
        id: 3,
        created_at: "2026-11-26T00:00:00.000Z",
        file_url: "https://example.com/deleted.png",
        preview_file_url: null,
        large_file_url: null,
        source: "",
        rating: "g",
        image_width: 800,
        image_height: 800,
        file_ext: "png",
        file_size: 1000,
        score: 10,
        fav_count: 5,
        tag_string: "furina_(genshin_impact) solo",
        is_deleted: true,
        is_pending: false,
      },
    ]);

    const posts = await fetchSfwArtworks({
      tags: ["furina_(genshin_impact)"],
      page: 1,
    });

    expect(danbooruClient.getDanbooruPosts).toHaveBeenCalledWith({
      tags: "furina_(genshin_impact) rating:g solo",
      limit: 20,
      page: 1,
    });
    expect(posts.map((p) => p.id)).toEqual([1]);
  });

  it("throws when Danbooru returns an empty post list", async () => {
    vi.mocked(danbooruClient.getDanbooruPosts).mockResolvedValue([]);

    await expect(
      fetchSfwArtworks({ tags: ["furina_(genshin_impact)"], page: 1 }),
    ).rejects.toThrow("No Danbooru posts found");
  });
});
