import "dotenv/config";
import { db } from "../prisma/db";
import { deliverDailyArtworks } from "../modules/delivery/delivery.service";
import { clientLogin } from "./discord-client.test";

async function main() {
  try {
    const client = await clientLogin();
    const result = await deliverDailyArtworks(client);
    console.log("Delivery result:", result);
  } catch (error) {
    console.error("Delivery failed:", error);
  } finally {
    await db.close();
  }
}

main();
