import { fetchSfwArtworks } from "../../integrations/danbooru/danbooru.service";
import { saveDanbooruArtwork } from "./artwork.repository";

export async function collectDanbooruArtworks(page = 1) {
  const posts = await fetchSfwArtworks({
    tags: ["furina_(genshin_impact)"],
    page,
  });

  // const result = await saveDanbooruArtworks(posts);

  return {
    page,
    // ...result,
  };
}