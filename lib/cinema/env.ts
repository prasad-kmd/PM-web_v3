import "server-only";

import type { CinemaCapabilities } from "./types";

export type { CinemaCapabilities };

/**
 * Cinema Studio — the only place that reads `process.env`.
 *
 * Exactly three variables are introduced by this feature:
 *
 *   TMDB_API_KEY               v3 key or v4 read token (auto-detected)
 *   OMDB_API_KEY               OMDb key (optional — scores simply don't render)
 *   NOTION_CINEMA_FAVORITES_ID data source id of the library database
 *
 * Everything else is a literal in `lib/cinema/config.ts`.
 */

export type TmdbAuth =
  { kind: "bearer"; value: string } | { kind: "key"; value: string };

function readEnv(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

/**
 * TMDB accepts two credential shapes. A v4 read token is a JWT (`eyJ…`) and
 * must be sent as a bearer header; a v3 key is a 32-char hex string and goes in
 * the query string. Detecting this here keeps the public surface to one var.
 */
export function getTmdbAuth(): TmdbAuth | null {
  const value = readEnv("TMDB_API_KEY", "TMDB_READ_TOKEN", "TMDB_ACCESS_TOKEN");
  if (!value) return null;
  return value.startsWith("eyJ")
    ? { kind: "bearer", value }
    : { kind: "key", value };
}

export function getOmdbKey(): string | null {
  return readEnv("OMDB_API_KEY", "OMDB_API", "OMDB_KEY");
}

/**
 * The library database. Shared with the existing Notion integration — no
 * dedicated integration or bot token is created for this feature.
 */
export function getCinemaLibraryDataSourceId(): string | null {
  return readEnv("NOTION_CINEMA_FAVORITES_ID", "NOTION_CINEMA_ID");
}

/**
 * The cinema **settings page** — a normal Notion page (no database). Its single
 * `code` block holds the JSON for provider, density, region and language.
 * Optional: without it settings fall back to the library database row.
 */
export function getCinemaSettingsPageId(): string | null {
  const raw = readEnv(
    "NOTION_CINEMA_SETTINGS_PAGE_ID",
    "CINEMA_SETTINGS_PAGE_ID",
  );
  if (!raw) return null;
  /* Accept a full page URL or a bare id with or without dashes. */
  const match = raw.match(/([0-9a-fA-F]{32})/);
  const id = match ? match[1] : raw.replace(/-/g, "");
  return /^[0-9a-fA-F]{32}$/.test(id) ? id : null;
}

/**
 * Same precedence as the invoice store: a shared integration token is used for
 * every Notion surface. Deliberately does **not** read `NOTION_INVOICES_TOKEN`,
 * which belongs to a different integration.
 */
export function getNotionWriteToken(): string | null {
  return readEnv(
    "NOTION_API_KEY",
    "NOTION_AUTH_TOKEN",
    "NOTION_API_TOKEN",
    "NOTION_TOKEN",
  );
}

/** Notion REST version — mirrors `lib/invoices/store.ts`. */
export const CINEMA_NOTION_API_VERSION = "2026-03-11";

export function getCinemaCapabilities(): CinemaCapabilities {
  return {
    tmdb: getTmdbAuth() !== null,
    omdb: getOmdbKey() !== null,
    notion:
      getNotionWriteToken() !== null && getCinemaLibraryDataSourceId() !== null,
    settings: getCinemaSettingsPageId() !== null,
  };
}
