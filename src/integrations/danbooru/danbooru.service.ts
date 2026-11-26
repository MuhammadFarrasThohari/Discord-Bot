import axios from "axios";

import { getDanbooruPosts, getDanbooruTag } from "./danbooru.client";
import {
  DanbooruTagNotFoundError,
  DanbooruUnavailableError,
  InvalidDanbooruTagError,
} from "./danbooru.errors";
import type { DanbooruPost } from "./danbooru.types";

interface FetchArtworkOptions {
  tags: string[];
  page?: number;
}

/**
 * Queries SFW solo-character artworks (`rating:g` and `chartags:1`) and
 * applies a defensive local filter in case Danbooru returns deleted,
 * pending, or fileless posts.
 */
export async function fetchSfwArtworks({
  tags,
  page = 1,
}: FetchArtworkOptions): Promise<DanbooruPost[]> {
  const queryTags = [...tags, "rating:g", "chartags:1"].join(" ");

  const posts = await getDanbooruPosts({
    tags: queryTags,
    limit: 20,
    page,
  });

  return posts.filter(
    (post) =>
      post.rating === "g" &&
      !post.is_deleted &&
      !post.is_pending &&
      Boolean(post.file_url),
  );
}

/**
 * Verifies that a tag exists on Danbooru as an active, non-empty character tag.
 * Translates Axios transport failures into `DanbooruUnavailableError` so command
 * handlers can surface a clean user-facing message.
 */
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
    if (
      error instanceof DanbooruTagNotFoundError ||
      error instanceof InvalidDanbooruTagError
    ) {
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
