import "server-only";

/**
 * Environment for the comments subsystem.
 *
 * Follows the same convention as the rest of the repo: read `process.env`
 * directly rather than introduce a validated env object.
 *
 * Optional:
 *   COMMENTS_ENABLED            "false" disables posting (reads keep working)
 *   COMMENTS_STORE_EMAIL        "false" stores `sha256:<16>` instead of the address
 *   COMMENTS_RATE_LIMIT         posts per burst window (default 3)
 *   COMMENTS_RATE_WINDOW_MS     burst window length (default 60_000)
 *   COMMENTS_DAILY_LIMIT        posts per IP per day (default 12)
 *   COMMENTS_AVATAR_TIMEOUT_MS  per-platform avatar budget (default 3000)
 */

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === "") return fallback;
  return raw !== "false" && raw !== "0" && raw !== "no";
}

function int(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name]?.trim() ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const commentConfig = {
  enabled: bool("COMMENTS_ENABLED", true),
  /** Keep the address in Notion so the owner can reply by mail. */
  storeEmail: bool("COMMENTS_STORE_EMAIL", true),
  burst: {
    limit: int("COMMENTS_RATE_LIMIT", 3),
    window: int("COMMENTS_RATE_WINDOW_MS", 60_000),
  },
  daily: {
    limit: int("COMMENTS_DAILY_LIMIT", 12),
    window: 24 * 60 * 60 * 1000,
  },
  avatarTimeoutMs: int("COMMENTS_AVATAR_TIMEOUT_MS", 3000),
} as const;
