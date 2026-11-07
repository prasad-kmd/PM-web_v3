import "server-only";

import type { Client } from "@notionhq/client";

import {
  CINEMA_DEFAULT_LANGUAGE,
  CINEMA_DEFAULT_REGION,
  CINEMA_SETTINGS_ENVELOPE_KIND,
  CINEMA_SETTINGS_ENVELOPE_VERSION,
} from "./config";
import { getCinemaSettingsPageId } from "./env";
import {
  CinemaPrefsSchema,
  getCinemaLibraryStorageMode,
  getCinemaNotionClient,
  readCinemaPrefsRow,
  saveCinemaPrefs,
} from "./library";
import {
  DEFAULT_CINEMA_PREFS,
  type CinemaPrefs,
  type CinemaSettingsMode,
} from "./types";

/**
 * Cinema settings — a plain Notion **page**, not a database.
 *
 * Everything the settings screen edits (default provider, poster density, TMDB
 * region and language) is written into a single `code` block on
 * `NOTION_CINEMA_SETTINGS_PAGE_ID`. One block, updated in place, so the page
 * stays readable and never grows a pile of stale rows.
 *
 * If that page is not configured the studio falls back to the `__cinema_prefs`
 * row inside the library database, and then to in-process defaults — the same
 * graceful ladder the library itself uses.
 *
 * The region and language are read by the TMDB client on every request through
 * `currentCinemaLocale()`, so changing them here changes certifications,
 * "where to watch" and discover filters for every screen.
 */

const RICH_TEXT_CHUNK = 1850;
const SETTINGS_TTL_MS = 60_000;

export type CinemaSettingsSnapshot = {
  prefs: CinemaPrefs;
  /** Where writes go: the settings page, the library database, or this process. */
  mode: CinemaSettingsMode;
  /** Set when the page/database exists but could not be read or parsed. */
  notice?: string;
};

type PageBlock = {
  id: string;
  type: string;
  code?: {
    rich_text?: { plain_text?: string | null }[] | null;
  } | null;
};

let cached: { at: number; snapshot: CinemaSettingsSnapshot } | null = null;

/** Locale used by the TMDB client. Seeded with the pinned defaults. */
let locale = {
  region: CINEMA_DEFAULT_REGION,
  language: CINEMA_DEFAULT_LANGUAGE,
};

export function currentCinemaLocale(): { region: string; language: string } {
  return locale;
}

export function invalidateCinemaSettings(): void {
  cached = null;
}

function applyLocale(prefs: CinemaPrefs): void {
  locale = { region: prefs.region, language: prefs.language };
}

function buildEnvelope(prefs: CinemaPrefs): string {
  return JSON.stringify({
    __kind: CINEMA_SETTINGS_ENVELOPE_KIND,
    v: CINEMA_SETTINGS_ENVELOPE_VERSION,
    data: prefs,
  });
}

function toRichText(
  text: string,
): { type: "text"; text: { content: string } }[] {
  const chunks: { type: "text"; text: { content: string } }[] = [];
  for (let index = 0; index < text.length; index += RICH_TEXT_CHUNK) {
    chunks.push({
      type: "text",
      text: { content: text.slice(index, index + RICH_TEXT_CHUNK) },
    });
  }
  return chunks;
}

function plainText(block: PageBlock): string {
  if (!block.code?.rich_text) return "";
  return block.code.rich_text
    .map((item) => item.plain_text ?? "")
    .join("")
    .trim();
}

function parseEnvelope(text: string): unknown {
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    const envelope = parsed as { __kind?: string; v?: number; data?: unknown };
    if (envelope.__kind !== CINEMA_SETTINGS_ENVELOPE_KIND) return null;
    if (envelope.v !== CINEMA_SETTINGS_ENVELOPE_VERSION) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

/** Older payloads are missing keys; fill them from the defaults before parsing. */
function coercePrefs(value: unknown): CinemaPrefs | null {
  if (!value || typeof value !== "object") return null;
  const parsed = CinemaPrefsSchema.safeParse({
    ...DEFAULT_CINEMA_PREFS,
    ...(value as Record<string, unknown>),
  });
  return parsed.success ? parsed.data : null;
}

async function listBlocks(
  client: Client,
  pageId: string,
): Promise<PageBlock[]> {
  const response = await client.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  });
  return response.results as unknown as PageBlock[];
}

async function readSettingsPage(
  client: Client,
  pageId: string,
): Promise<{ prefs: CinemaPrefs | null; blockId: string | null }> {
  const blocks = await listBlocks(client, pageId);
  for (const block of blocks) {
    if (block.type !== "code") continue;
    const prefs = coercePrefs(parseEnvelope(plainText(block)));
    if (prefs) return { prefs, blockId: block.id };
  }
  return { prefs: null, blockId: null };
}

async function writeSettingsPage(
  client: Client,
  pageId: string,
  prefs: CinemaPrefs,
): Promise<void> {
  const text = buildEnvelope(prefs);
  const { blockId } = await readSettingsPage(client, pageId);

  if (blockId) {
    await client.blocks.update({
      block_id: blockId,
      code: { rich_text: toRichText(text) } as never,
    });
    return;
  }

  await client.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: "block",
        type: "code",
        code: {
          language: "json",
          rich_text: toRichText(text),
        },
      } as never,
    ],
  });
}

/**
 * Reads preferences page → database → defaults. Cached for a minute, because
 * every TMDB request asks for the locale.
 */
export async function loadCinemaSettings(
  force = false,
): Promise<CinemaSettingsSnapshot> {
  if (!force && cached && Date.now() - cached.at < SETTINGS_TTL_MS) {
    return cached.snapshot;
  }

  const snapshot = await readSettings();
  cached = { at: Date.now(), snapshot };
  applyLocale(snapshot.prefs);
  return snapshot;
}

async function readSettings(): Promise<CinemaSettingsSnapshot> {
  const pageId = getCinemaSettingsPageId();
  const client = getCinemaNotionClient();
  const databaseConfigured = getCinemaLibraryStorageMode() === "cloud";

  if (pageId && client) {
    try {
      const { prefs } = await readSettingsPage(client, pageId);
      if (prefs) return { prefs, mode: "page" };
    } catch (error) {
      return {
        prefs: DEFAULT_CINEMA_PREFS,
        mode: "page",
        notice: `The settings page did not answer (${
          error instanceof Error ? error.message : "unknown error"
        }). Defaults are in use.`,
      };
    }

    /* Page exists and answered, but holds no block yet — fall through to the
       database so the first visit keeps whatever was already saved there. */
  }

  try {
    const fromDatabase = await readCinemaPrefsRow();
    if (fromDatabase) {
      return { prefs: fromDatabase, mode: pageId ? "page" : "database" };
    }
  } catch {
    /* the database is optional; fall through to defaults */
  }

  const mode: CinemaSettingsMode = pageId
    ? "page"
    : databaseConfigured
      ? "database"
      : "session";

  return { prefs: DEFAULT_CINEMA_PREFS, mode };
}

/** Called by the prefs route; writes to whichever store is configured. */
export async function saveCinemaSettings(
  prefs: CinemaPrefs,
): Promise<CinemaSettingsSnapshot> {
  const parsed = CinemaPrefsSchema.parse(prefs);
  const pageId = getCinemaSettingsPageId();
  const client = getCinemaNotionClient();

  invalidateCinemaSettings();

  if (pageId && client) {
    try {
      await writeSettingsPage(client, pageId, parsed);
      applyLocale(parsed);
      return { prefs: parsed, mode: "page" };
    } catch (error) {
      return {
        prefs: parsed,
        mode: "page",
        notice: `Settings were kept for this session only — the page rejected the write (${
          error instanceof Error ? error.message : "unknown error"
        }).`,
      };
    }
  }

  const saved = await saveCinemaPrefs(parsed);
  applyLocale(parsed);
  return {
    prefs: saved.prefs,
    mode: saved.storageMode === "cloud" ? "database" : "session",
  };
}

/**
 * Cheap guard for server code that is about to call TMDB: makes sure the locale
 * cache is warm without caring about the result.
 */
export async function ensureCinemaLocale(): Promise<void> {
  await loadCinemaSettings();
}
