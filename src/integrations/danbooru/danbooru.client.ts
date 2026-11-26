import axios, { type AxiosInstance } from "axios";

import { getDanbooruEnv } from "../../config/env";
import type { DanbooruPost, DanbooruTag } from "./danbooru.types";

const MAX_POSTS_PER_REQUEST = 20;
const DANBOORU_CHARACTER_TAG_CATEGORY = 4;

let cachedClient: AxiosInstance | null = null;

/**
 * Lazily initializes the shared Danbooru HTTP client so importing this module
 * in tests does not require live environment configuration upfront.
 */
function getDanbooruClient(): AxiosInstance {
  if (!cachedClient) {
    const { DANBOORU_BASE_URL, DANBOORU_USER_AGENT } = getDanbooruEnv();

    cachedClient = axios.create({
      baseURL: DANBOORU_BASE_URL,
      timeout: 15000,
      headers: {
        "User-Agent": DANBOORU_USER_AGENT,
      },
    });
  }

  return cachedClient;
}

interface GetPostsParams {
  tags: string;
  limit?: number;
  page?: number;
}

/**
 * Fetches posts from Danbooru `/posts.json`, capped at 20 posts per request
 * to stay conservative with Danbooru's anonymous API rate limits.
 */
export async function getDanbooruPosts({
  tags,
  limit = MAX_POSTS_PER_REQUEST,
  page = 1,
}: GetPostsParams): Promise<DanbooruPost[]> {
  const response = await getDanbooruClient().get<DanbooruPost[]>(
    "/posts.json",
    {
      params: {
        tags,
        limit: Math.min(limit, MAX_POSTS_PER_REQUEST),
        page,
      },
    },
  );

  return response.data;
}

/**
 * Looks up an exact Danbooru character tag (category 4) by name.
 */
export async function getDanbooruTag(
  tagName: string,
): Promise<DanbooruTag | null> {
  const response = await getDanbooruClient().get<DanbooruTag[]>("/tags.json", {
    params: {
      "search[name]": tagName,
      "search[category]": DANBOORU_CHARACTER_TAG_CATEGORY,
      limit: 1,
    },
  });

  return (
    response.data.find(
      (tag) => tag.name.toLowerCase() === tagName.toLowerCase(),
    ) ?? null
  );
}
