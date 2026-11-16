import "dotenv/config";

import { collectDanbooruArtworks } from "../modules/artwork/artwork.service";
import { db } from "../prisma/db";

async function main() {
  try {
    const result = await collectDanbooruArtworks();

    console.log("Danbooru collection result:");
    console.log(result);
  } catch (error) {
    console.error("Failed to collect Danbooru artworks:", error);
  } finally {
    await db.close();
  }
}

main();