import { getDanbooruPosts, getDanbooruTag } from "./danbooru.client";
import axios from "axios";
import type { DanbooruPost } from "./danbooru.types";

interface FetchArtworkOptions {
  tags: string[];
  page?: number;
}

export async function fetchSfwArtworks({
  tags,
  page = 1,
}: FetchArtworkOptions): Promise<DanbooruPost[]> {
  const queryTags = [...tags, "rating:g", "solo"].join(" ");

  const posts = await getDanbooruPosts({
    tags: queryTags,
    limit: 20,
    page,
  });

  if (posts.length == 0) {
    throw new Error();
  }

  return posts.filter((post) => {
    return post.rating === "g" && !post.is_deleted && !post.is_pending && Boolean(post.file_url);
  });
}

export class DanbooruTagNotFoundError extends Error {
  constructor(tag: string) {
    super(`Danbooru tag "${tag}" was not found.`);
    this.name = "DanbooruTagNotFoundError";
  }
}

export class InvalidDanbooruTagError extends Error {
  constructor(tag: string) {
    super(`"${tag}" is not a valid character tag.`);
    this.name = "InvalidDanbooruTagError";
  }
}

export class DanbooruUnavailableError extends Error {
  constructor() {
    super("Danbooru is currently unavailable. Please try again later.");
    this.name = "DanbooruUnavailableError";
  }
}

export async function validateDanbooruCharacterTag(tagName: string) {
  try {
    const tag = await getDanbooruTag(tagName);

    if (!tag) {
      throw new DanbooruTagNotFoundError(tagName);
    }

    if (tag.post_count <= 0 || tag.is_deprecated) {
      throw new InvalidDanbooruTagError(tagName);
    }

    return tag;
  } catch (error) {
    if (error instanceof DanbooruTagNotFoundError || error instanceof InvalidDanbooruTagError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      console.error("[DANBOORU] API request failed:", {
        status: error.response?.status,
        message: error.message,
      });

      throw new DanbooruUnavailableError();
    }

    throw error;
  }
}
