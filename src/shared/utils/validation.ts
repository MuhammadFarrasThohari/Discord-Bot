import type { ZodError } from "zod";

/**
 * Formats Zod validation issues into a Discord-friendly bulleted list.
 */
export function formatZodIssues(error: ZodError): string {
  return error.issues.map((issue) => `• ${issue.message}`).join("\n");
}
