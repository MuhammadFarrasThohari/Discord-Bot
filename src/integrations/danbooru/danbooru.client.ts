import axios from "axios";
import type { DanbooruPost, DanbooruTag } from "./danbooru.types";

const danbooruClient = axios.create({
  baseURL: process.env.DANBOORU_BASE_URL,
  timeout: 15000,
  headers: {
    "User-Agent":
      process.env.DANBOORU_USER_AGENT ?? "DailyWaifuBot/1.0",
  },
});

interface GetPostsParams {
  tags: string;
  limit?: number;
  page?: number;
}

export async function getDanbooruPosts({
  tags,
  limit = 20,
  page = 1,
}: GetPostsParams): Promise<DanbooruPost[]> {
  const response = await danbooruClient.get<DanbooruPost[]>(
    "/posts.json",
    {
      params: {
        tags,
        limit: Math.min(limit, 20),
        page,
      },
    },
  );

  return response.data;
}

export async function getDanbooruTag(
  tagName: string,
): Promise<DanbooruTag | null> {
  const response = await danbooruClient.get<DanbooruTag[]>("/tags.json", {
    params: {
      "search[name]": tagName,
      "search[category]": 4,
      limit: 1,
    },
  });

  return (
    response.data.find(
      (tag) => tag.name.toLowerCase() === tagName.toLowerCase(),
    ) ?? null
  );
}