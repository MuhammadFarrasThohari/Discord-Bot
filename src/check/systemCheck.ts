import { db } from "../prisma/db";
import { getDanbooruEnv } from "../config/env";

type CheckResult = { name: string; ok: boolean; detail?: string };

async function checkDatabase(): Promise<CheckResult> {
  try {
    const plan = db.raw.sql`SELECT 1 AS ok`.returnsRow({ ok: "pg/int4@1" }).build();

    const [row] = await db.query(plan);
    if (row?.ok !== 1) throw new Error("Unexpected result from database");

    return { name: "Database", ok: true };
  } catch (err) {
    return { name: "Database", ok: false, detail: (err as Error).message };
  }
}

async function checkDanbooru(): Promise<CheckResult> {
  const { DANBOORU_BASE_URL, DANBOORU_USER_AGENT } = getDanbooruEnv();

  try {
    const res = await fetch(`${DANBOORU_BASE_URL}/posts.json?limit=1`, {
      headers: { "User-Agent": DANBOORU_USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { name: "Danbooru API", ok: true };
  } catch (err) {
    return { name: "Danbooru API", ok: false, detail: (err as Error).message };
  }
}

export async function runStartupChecks(): Promise<void> {
  console.log("Running system checks...");

  const results = await Promise.all([checkDatabase(), checkDanbooru()]);

  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? ` - ${r.detail}` : ""}`);
  }

  if (results.some((r) => !r.ok)) {
    throw new Error("System check failed, bot tidak dinyalakan.");
  }
}
