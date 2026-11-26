import type { Client } from "discord.js";
import cron from "node-cron";

import { deliverDailyArtworks } from "../modules/delivery/delivery.service";

let isRunning = false;

/**
 * Schedules the daily artwork delivery job at 08:00 WIB (`Asia/Jakarta`).
 * Uses an in-process `isRunning` guard so slow Danbooru/Discord runs never
 * overlap across consecutive ticks.
 */
export function startArtworkJob(client: Client) {
  console.log("[CRON] Artwork job initialized.");

  return cron.schedule(
    "0 8 * * *",
    async () => {
      if (isRunning) {
        console.log("[CRON] Job is still running. Skipping.");
        return;
      }

      isRunning = true;

      try {
        console.log("[CRON] Starting daily artwork delivery...");

        await deliverDailyArtworks(client);

        console.log("[CRON] Artwork job completed.");
      } catch (error) {
        console.error("[CRON] Artwork job failed:", error);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: "Asia/Jakarta",
    },
  );
}
