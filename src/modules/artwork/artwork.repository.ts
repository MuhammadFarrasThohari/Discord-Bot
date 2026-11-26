import type { DanbooruPost } from "../../integrations/danbooru/danbooru.types";
import { db } from "../../prisma/db";

export async function findArtworkBySourceId(sourceId: string) {
  return db.orm.public.Artwork.where({
    source: "danbooru",
    sourceId,
  }).first();
}

/**
 * Persists a Danbooru post into the local `Artwork` table for delivery
 * deduplication and historical tracking.
 */
export async function saveDanbooruArtwork(post: DanbooruPost) {
  if (!post.file_url) {
    throw new Error(`Danbooru post ${post.id} does not have a file URL.`);
  }

  return db.orm.public.Artwork.create({
    source: "danbooru",
    sourceId: String(post.id),
    title: null,
    fileUrl: post.file_url,
    previewUrl: post.preview_file_url,
    sampleUrl: post.large_file_url,
    rating: post.rating,
    fileExt: post.file_ext,
    fileSize: post.file_size,
    score: post.score,
    favoriteCount: post.fav_count,
    tagString: post.tag_string,
    isDeleted: post.is_deleted,
    isPending: post.is_pending,
    sourceCreatedAt: new Date(post.created_at),
  });
}
