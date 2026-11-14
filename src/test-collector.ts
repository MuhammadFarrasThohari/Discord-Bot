import "dotenv/config";

import { collectDanbooruArtworks } from "./modules/artwork/artwork.service";
import { db } from "./prisma/db";

async function main() {
  try {
    const result = await collectDanbooruArtworks(1);

    console.log("Collection result:", result);
  } catch (error) {
    console.error("Collection failed:", error);
  } finally {
    await db.close();
  }
}

main();