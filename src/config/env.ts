import { z } from "zod";

const botEnvSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required."),
  DISCORD_GUILD_ID: z.string().min(1, "DISCORD_GUILD_ID is required."),
});

const registerCommandsEnvSchema = botEnvSchema.extend({
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required."),
});

const danbooruEnvSchema = z.object({
  DANBOORU_BASE_URL: z
    .string()
    .url("DANBOORU_BASE_URL must be a valid URL.")
    .default("https://danbooru.donmai.us"),
  DANBOORU_USER_AGENT: z
    .string()
    .min(1)
    .default("DailyWaifuBot/1.0"),
});

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
});

/**
 * Parses a subset of `process.env` lazily so unit tests can import modules
 * without providing unrelated runtime secrets, while entrypoints still fail fast.
 */
function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  scope: string,
): z.infer<T> {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");

    throw new Error(`[CONFIG] Invalid ${scope} environment configuration: ${details}`);
  }

  return result.data;
}

export function getBotEnv() {
  return parseEnv(botEnvSchema, "bot");
}

export function getRegisterCommandsEnv() {
  return parseEnv(registerCommandsEnvSchema, "command registration");
}

export function getDanbooruEnv() {
  return parseEnv(danbooruEnvSchema, "Danbooru");
}

export function getDatabaseUrl(): string {
  return parseEnv(databaseEnvSchema, "database").DATABASE_URL;
}
