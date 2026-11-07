import "server-only";

import { randomUUID } from "node:crypto";

import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { z } from "zod";

import {
  CINEMA_LIBRARY_STATUSES,
  CINEMA_MAX_NOTES_LENGTH,
  CINEMA_NOTION_ENVELOPE_KIND,
  CINEMA_NOTION_ENVELOPE_VERSION,
  CINEMA_PREFS_ROW_TITLE,
} from "./config";
import {
  CINEMA_NOTION_API_VERSION,
  getCinemaLibraryDataSourceId,
  getNotionWriteToken,
} from "./env";
import { DEFAULT_CINEMA_PREFS } from "./types";
import type {
  CinemaLibraryDraft,
  CinemaLibraryEntry,
  CinemaPrefs,
  CinemaMediaType,
} from "./types";

export { DEFAULT_CINEMA_PREFS };

const API_VERSION = CINEMA_NOTION_API_VERSION;
const RICH_TEXT_CHUNK = 1850;
const SCHEMA_TTL_MS = 5 * 60_000;

export type CinemaStorageMode = "cloud" | "session";

type PropertyMap = Record<string, { id: string; type: string }>;

type CachedDataSource = {
  dataSourceId: string;
  titleProp: string;
  properties: PropertyMap;
  expiresAt: number;
};

const dsCache = new Map<string, CachedDataSource>();

/**
 * Session fallback.
 *
 * Mirrors the invoice store: with no Notion database configured the studio is
 * still fully usable for the life of the server process, and the UI says
 * "Session library" instead of pretending the data is durable.
 */
const memoryStore: {
  entries: Map<string, CinemaLibraryEntry>;
  prefs: CinemaPrefs | null;
} = {
  entries: new Map(),
  prefs: null,
};

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const StatusSchema = z.enum(CINEMA_LIBRARY_STATUSES);

const MediaTypeSchema = z.enum(["movie", "tv"]);

export const CinemaLibraryDraftSchema = z.object({
  titleKey: z.string().trim().min(3).max(64),
  tmdbId: z.number().int().positive(),
  mediaType: MediaTypeSchema,
  title: z.string().trim().min(1).max(300),
  year: z.number().int().min(1800).max(2200).nullable().default(null),
  status: StatusSchema,
  rating: z.number().min(0).max(10).nullable().optional(),
  genres: z.array(z.string().trim().max(40)).max(8).optional(),
  posterPath: z.string().max(160).nullable().optional(),
  runtimeMinutes: z.number().int().min(0).max(2000).nullable().optional(),
  seasons: z.number().int().min(0).max(300).nullable().optional(),
  progress: z.string().trim().max(32).nullable().optional(),
  notes: z.string().max(CINEMA_MAX_NOTES_LENGTH).optional(),
});

export const CinemaLibraryPatchSchema = z.object({
  status: StatusSchema.optional(),
  rating: z.number().min(0).max(10).nullable().optional(),
  notes: z.string().max(CINEMA_MAX_NOTES_LENGTH).optional(),
  progress: z.string().trim().max(32).nullable().optional(),
});

/**
 * `region` and `language` arrived with the settings page, so they are optional
 * on the way in (old rows and old clients do not have them) and always present
 * on the way out.
 */
export const CinemaPrefsSchema = z
  .object({
    defaultProviderId: z.string().trim().min(1).max(40),
    posterDensity: z.enum(["comfortable", "compact"]),
    region: z.string().trim().min(2).max(2).optional(),
    language: z.string().trim().min(2).max(12).optional(),
  })
  .transform((value): CinemaPrefs => ({
    defaultProviderId: value.defaultProviderId,
    posterDensity: value.posterDensity,
    region: (value.region ?? DEFAULT_CINEMA_PREFS.region).toUpperCase(),
    language: value.language ?? DEFAULT_CINEMA_PREFS.language,
  }));

/* -------------------------------------------------------------------------- */
/* Client + schema cache                                                      */
/* -------------------------------------------------------------------------- */

let cachedClient: Client | null = null;
let cachedClientToken = "";

/** Shared Notion client — the settings page reuses it, same token, same version. */
export function getCinemaNotionClient(): Client | null {
  return getRemoteClient();
}

function getRemoteClient(): Client | null {
  const token = getNotionWriteToken();
  if (!token) return null;
  if (!cachedClient || cachedClientToken !== token) {
    cachedClientToken = token;
    cachedClient = new Client({
      auth: token,
      notionVersion: process.env.NOTION_API_VERSION?.trim() || API_VERSION,
    });
  }
  return cachedClient;
}

export function getCinemaLibraryStorageMode(): CinemaStorageMode {
  return getNotionWriteToken() && getCinemaLibraryDataSourceId()
    ? "cloud"
    : "session";
}

async function resolveDataSource(
  client: Client,
  rawId: string,
): Promise<CachedDataSource> {
  const cleanId = rawId.trim();
  const hit = dsCache.get(cleanId);
  if (hit && hit.expiresAt > Date.now()) return hit;

  let dataSourceId = cleanId;
  try {
    const db = (await client.databases.retrieve({
      database_id: cleanId,
    })) as unknown as { data_sources?: Array<{ id: string }> };
    if (db.data_sources?.[0]?.id) dataSourceId = db.data_sources[0].id;
  } catch {
    // The id may already be a data_source_id.
  }

  const ds = (await client.dataSources.retrieve({
    data_source_id: dataSourceId,
  })) as unknown as {
    properties?: Record<string, { id: string; type: string }>;
  };

  const properties: PropertyMap = ds.properties ?? {};
  const titleProp =
    Object.entries(properties).find(
      ([, value]) => value.type === "title",
    )?.[0] ?? "Name";

  const entry: CachedDataSource = {
    dataSourceId,
    titleProp,
    properties,
    expiresAt: Date.now() + SCHEMA_TTL_MS,
  };
  dsCache.set(cleanId, entry);
  return entry;
}

/* -------------------------------------------------------------------------- */
/* Notion property helpers (alias + type tolerant, same as the invoice store) */
/* -------------------------------------------------------------------------- */

function toRichTextChunks(value: string) {
  if (!value) return [];
  const chunks: Array<{ type: "text"; text: { content: string } }> = [];
  for (let index = 0; index < value.length; index += RICH_TEXT_CHUNK) {
    chunks.push({
      type: "text",
      text: { content: value.slice(index, index + RICH_TEXT_CHUNK) },
    });
  }
  return chunks;
}

function findPropName(
  schema: PropertyMap,
  candidates: readonly string[],
): { name: string; type: string } | null {
  const lookup = new Map<string, { name: string; type: string }>();
  for (const [name, value] of Object.entries(schema)) {
    lookup.set(name.toLowerCase(), { name, type: value.type });
  }
  for (const candidate of candidates) {
    const match = lookup.get(candidate.toLowerCase());
    if (match) return match;
  }
  return null;
}

function assignString(
  out: Record<string, unknown>,
  schema: PropertyMap,
  candidates: readonly string[],
  value: string | null | undefined,
) {
  const target = findPropName(schema, candidates);
  if (!target) return;
  const text = value ?? "";
  switch (target.type) {
    case "rich_text":
      out[target.name] = { rich_text: toRichTextChunks(text) };
      break;
    case "select":
      out[target.name] = { select: text ? { name: text } : null };
      break;
    case "status":
      if (text) out[target.name] = { status: { name: text } };
      break;
    case "url":
      out[target.name] = { url: text || null };
      break;
    case "title":
      out[target.name] = { title: toRichTextChunks(text) };
      break;
    default:
      break;
  }
}

function assignNumber(
  out: Record<string, unknown>,
  schema: PropertyMap,
  candidates: readonly string[],
  value: number | null | undefined,
) {
  const target = findPropName(schema, candidates);
  if (!target) return;
  if (target.type === "number") {
    out[target.name] = {
      number:
        typeof value === "number" && Number.isFinite(value) ? value : null,
    };
  } else if (target.type === "rich_text") {
    out[target.name] = {
      rich_text:
        typeof value === "number" ? toRichTextChunks(String(value)) : [],
    };
  }
}

function assignMultiSelect(
  out: Record<string, unknown>,
  schema: PropertyMap,
  candidates: readonly string[],
  values: readonly string[] | undefined,
) {
  const target = findPropName(schema, candidates);
  if (!target) return;
  if (target.type === "multi_select") {
    out[target.name] = {
      multi_select: (values ?? []).filter(Boolean).map((name) => ({ name })),
    };
  } else if (target.type === "rich_text") {
    out[target.name] = {
      rich_text: toRichTextChunks((values ?? []).join(", ")),
    };
  }
}

function assignDate(
  out: Record<string, unknown>,
  schema: PropertyMap,
  candidates: readonly string[],
  value: string | null | undefined,
) {
  const target = findPropName(schema, candidates);
  if (!target) return;
  if (target.type === "date") {
    out[target.name] = {
      date:
        typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
          ? { start: value.slice(0, 10) }
          : null,
    };
  }
}

function readText(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const value = prop as {
    type?: string;
    title?: Array<{ plain_text?: string }>;
    rich_text?: Array<{ plain_text?: string }>;
    select?: { name?: string } | null;
    status?: { name?: string } | null;
    url?: string | null;
  };
  if (value.type === "title" && Array.isArray(value.title)) {
    return value.title.map((item) => item.plain_text ?? "").join("");
  }
  if (value.type === "rich_text" && Array.isArray(value.rich_text)) {
    return value.rich_text.map((item) => item.plain_text ?? "").join("");
  }
  if (value.type === "select") return value.select?.name ?? "";
  if (value.type === "status") return value.status?.name ?? "";
  if (value.type === "url") return value.url ?? "";
  return "";
}

function readNumberProp(prop: unknown): number | null {
  if (!prop || typeof prop !== "object") return null;
  const value = prop as { type?: string; number?: number | null };
  return value.type === "number" && typeof value.number === "number"
    ? value.number
    : null;
}

function readPropByAlias(
  properties: Record<string, unknown>,
  schema: PropertyMap,
  candidates: readonly string[],
): unknown {
  const target = findPropName(schema, candidates);
  if (!target) return null;
  return properties[target.name] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Property candidates — the DB may use any of these names                    */
/* -------------------------------------------------------------------------- */

const PROP = {
  tmdbId: ["TMDB ID", "Tmdb Id", "TMDB", "TmdbID"],
  mediaType: ["Media Type", "Type", "Kind"],
  year: ["Year", "Release Year"],
  status: ["Status", "Library Status"],
  rating: ["My Rating", "Rating", "Score"],
  genres: ["Genres", "Genre"],
  poster: ["Poster", "Poster URL", "Cover"],
  runtime: ["Runtime", "Runtime (min)"],
  seasons: ["Seasons", "Season Count"],
  progress: ["Progress", "Watch Progress", "Episode"],
  notes: ["Notes", "Comment", "Review"],
  added: ["Added", "Added At", "Date Added"],
  payload: ["Payload JSON", "Payload", "Cinema JSON", "JSON", "Data"],
} as const;

/* -------------------------------------------------------------------------- */
/* Serialisation                                                              */
/* -------------------------------------------------------------------------- */

function buildEnvelope(entry: CinemaLibraryEntry): string {
  return JSON.stringify({
    __kind: CINEMA_NOTION_ENVELOPE_KIND,
    v: CINEMA_NOTION_ENVELOPE_VERSION,
    data: entry,
  });
}

function buildPrefsEnvelope(prefs: CinemaPrefs): string {
  return JSON.stringify({
    __kind: `${CINEMA_NOTION_ENVELOPE_KIND}-prefs`,
    v: CINEMA_NOTION_ENVELOPE_VERSION,
    data: prefs,
  });
}

function toNotionProperties(
  ds: CachedDataSource,
  entry: CinemaLibraryEntry,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  properties[ds.titleProp] = {
    title: toRichTextChunks(
      entry.year ? `${entry.title} (${entry.year})` : entry.title,
    ),
  };

  assignNumber(properties, ds.properties, PROP.tmdbId, entry.tmdbId);
  assignString(properties, ds.properties, PROP.mediaType, entry.mediaType);
  assignNumber(properties, ds.properties, PROP.year, entry.year);
  assignString(properties, ds.properties, PROP.status, entry.status);
  assignNumber(properties, ds.properties, PROP.rating, entry.rating);
  assignMultiSelect(properties, ds.properties, PROP.genres, entry.genres);
  assignString(properties, ds.properties, PROP.poster, entry.posterPath);
  assignNumber(properties, ds.properties, PROP.runtime, entry.runtimeMinutes);
  assignNumber(properties, ds.properties, PROP.seasons, entry.seasons);
  assignString(properties, ds.properties, PROP.progress, entry.progress);
  assignString(properties, ds.properties, PROP.notes, entry.notes);
  assignDate(properties, ds.properties, PROP.added, entry.addedAt);

  // The lossless copy always wins on read, so the row survives missing columns.
  assignString(properties, ds.properties, PROP.payload, buildEnvelope(entry));

  return properties;
}

function parseEnvelope(raw: string): unknown {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const envelope = parsed as { __kind?: string; v?: number; data?: unknown };
    if (envelope.__kind !== CINEMA_NOTION_ENVELOPE_KIND) return null;
    if (envelope.v !== CINEMA_NOTION_ENVELOPE_VERSION) return null;
    return envelope.data ?? null;
  } catch {
    return null;
  }
}

function coerceEntry(
  candidate: unknown,
  pageId: string,
): CinemaLibraryEntry | null {
  if (!candidate || typeof candidate !== "object") return null;
  const value = candidate as Partial<CinemaLibraryEntry>;
  if (typeof value.titleKey !== "string" || typeof value.title !== "string") {
    return null;
  }
  const mediaType: CinemaMediaType = value.mediaType === "tv" ? "tv" : "movie";
  const status =
    typeof value.status === "string" &&
    (CINEMA_LIBRARY_STATUSES as readonly string[]).includes(value.status)
      ? (value.status as CinemaLibraryEntry["status"])
      : "Watchlist";
  return {
    id: pageId,
    titleKey: value.titleKey,
    tmdbId: typeof value.tmdbId === "number" ? value.tmdbId : 0,
    mediaType,
    title: value.title,
    year: typeof value.year === "number" ? value.year : null,
    status,
    rating: typeof value.rating === "number" ? value.rating : null,
    genres: Array.isArray(value.genres)
      ? value.genres.filter(
          (genre): genre is string => typeof genre === "string",
        )
      : [],
    posterPath: typeof value.posterPath === "string" ? value.posterPath : null,
    runtimeMinutes:
      typeof value.runtimeMinutes === "number" ? value.runtimeMinutes : null,
    seasons: typeof value.seasons === "number" ? value.seasons : null,
    progress: typeof value.progress === "string" ? value.progress : null,
    notes: typeof value.notes === "string" ? value.notes : "",
    addedAt:
      typeof value.addedAt === "string"
        ? value.addedAt
        : new Date().toISOString(),
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString(),
    source: "notion",
  };
}

function parsePage(page: PageObjectResponse, ds: CachedDataSource) {
  const properties = page.properties as unknown as Record<string, unknown>;
  const title = readText(properties[ds.titleProp]);
  if (title === CINEMA_PREFS_ROW_TITLE) return { kind: "prefs" as const };

  const envelope = parseEnvelope(
    readText(readPropByAlias(properties, ds.properties, PROP.payload)),
  );
  const fromEnvelope = coerceEntry(envelope, page.id);
  if (fromEnvelope) {
    return { kind: "entry" as const, entry: fromEnvelope };
  }

  // Fallback: rebuild from the visible columns when the payload is missing.
  const status = readText(
    readPropByAlias(properties, ds.properties, PROP.status),
  );
  const mediaType = readText(
    readPropByAlias(properties, ds.properties, PROP.mediaType),
  );
  const tmdbId = readNumberProp(
    readPropByAlias(properties, ds.properties, PROP.tmdbId),
  );
  if (!tmdbId) return { kind: "skip" as const };

  const entry: CinemaLibraryEntry = {
    id: page.id,
    titleKey: `${mediaType === "tv" ? "tv" : "movie"}:${tmdbId}`,
    tmdbId,
    mediaType: mediaType === "tv" ? "tv" : "movie",
    title: title.replace(/\s*\(\d{4}\)$/, ""),
    year: readNumberProp(readPropByAlias(properties, ds.properties, PROP.year)),
    status:
      status && (CINEMA_LIBRARY_STATUSES as readonly string[]).includes(status)
        ? (status as CinemaLibraryEntry["status"])
        : "Watchlist",
    rating: readNumberProp(
      readPropByAlias(properties, ds.properties, PROP.rating),
    ),
    genres: [],
    posterPath:
      readText(readPropByAlias(properties, ds.properties, PROP.poster)) || null,
    runtimeMinutes: readNumberProp(
      readPropByAlias(properties, ds.properties, PROP.runtime),
    ),
    seasons: readNumberProp(
      readPropByAlias(properties, ds.properties, PROP.seasons),
    ),
    progress:
      readText(readPropByAlias(properties, ds.properties, PROP.progress)) ||
      null,
    notes: readText(readPropByAlias(properties, ds.properties, PROP.notes)),
    addedAt: new Date(page.created_time).toISOString(),
    updatedAt: new Date(page.last_edited_time).toISOString(),
    source: "notion",
  };

  return { kind: "entry" as const, entry };
}

/* -------------------------------------------------------------------------- */
/* Remote reads                                                               */
/* -------------------------------------------------------------------------- */

async function queryAllPages(
  client: Client,
  dataSourceId: string,
): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  for (let guard = 0; guard < 10; guard += 1) {
    const response = await client.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    for (const item of response.results) {
      if (item.object === "page" && "properties" in item) {
        const page = item as PageObjectResponse;
        if (!page.in_trash && !page.archived) pages.push(page);
      }
    }
    if (!response.has_more || !response.next_cursor) break;
    cursor = response.next_cursor;
  }

  return pages;
}

/**
 * Reads only the `__cinema_prefs` row.
 *
 * `listCinemaLibrary` returns it too, but the settings loader runs on every
 * TMDB call and has no business materialising the whole library.
 */
export async function readCinemaPrefsRow(): Promise<CinemaPrefs | null> {
  const client = getRemoteClient();
  const rawId = getCinemaLibraryDataSourceId();
  if (!client || !rawId) return memoryStore.prefs;

  const ds = await resolveDataSource(client, rawId);
  const pages = await queryAllPages(client, ds.dataSourceId);
  const row = pages.find(
    (page) =>
      readText(page.properties[ds.titleProp]) === CINEMA_PREFS_ROW_TITLE,
  );
  if (!row) return memoryStore.prefs;

  const envelope = parseEnvelope(
    readText(
      readPropByAlias(
        row.properties as unknown as Record<string, unknown>,
        ds.properties,
        PROP.payload,
      ),
    ),
  );
  const candidate = CinemaPrefsSchema.safeParse(envelope);
  return candidate.success ? candidate.data : memoryStore.prefs;
}

export type CinemaLibrarySnapshot = {
  entries: CinemaLibraryEntry[];
  prefs: CinemaPrefs;
  storageMode: CinemaStorageMode;
  /** Set when the cloud read failed and the session store answered instead. */
  notice?: string;
};

function sortEntries(entries: CinemaLibraryEntry[]): CinemaLibraryEntry[] {
  return [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listCinemaLibrary(): Promise<CinemaLibrarySnapshot> {
  const client = getRemoteClient();
  const rawId = getCinemaLibraryDataSourceId();

  if (!client || !rawId) {
    return {
      entries: sortEntries(Array.from(memoryStore.entries.values())),
      prefs: memoryStore.prefs ?? DEFAULT_CINEMA_PREFS,
      storageMode: "session",
    };
  }

  try {
    const ds = await resolveDataSource(client, rawId);
    const pages = await queryAllPages(client, ds.dataSourceId);

    const entries: CinemaLibraryEntry[] = [];
    let prefs: CinemaPrefs | null = null;

    for (const page of pages) {
      const parsed = parsePage(page, ds);
      if (parsed.kind === "entry") entries.push(parsed.entry);
      if (parsed.kind === "prefs") {
        const envelope = parseEnvelope(
          readText(
            readPropByAlias(
              page.properties as unknown as Record<string, unknown>,
              ds.properties,
              PROP.payload,
            ),
          ),
        );
        const candidate = CinemaPrefsSchema.safeParse(envelope);
        if (candidate.success) prefs = candidate.data;
      }
    }

    return {
      entries: sortEntries(entries),
      prefs: prefs ?? memoryStore.prefs ?? DEFAULT_CINEMA_PREFS,
      storageMode: "cloud",
    };
  } catch (error) {
    return {
      entries: sortEntries(Array.from(memoryStore.entries.values())),
      prefs: memoryStore.prefs ?? DEFAULT_CINEMA_PREFS,
      storageMode: "session",
      notice:
        error instanceof Error && error.message
          ? `Notion did not answer (${error.message}). The library is showing this session only.`
          : "Notion did not answer. The library is showing this session only.",
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

function materialise(
  draft: CinemaLibraryDraft,
  previous: CinemaLibraryEntry | null,
): CinemaLibraryEntry {
  const now = new Date().toISOString();
  return {
    id: previous?.id ?? randomUUID(),
    titleKey: draft.titleKey,
    tmdbId: draft.tmdbId,
    mediaType: draft.mediaType,
    title: draft.title,
    year: draft.year ?? null,
    status: draft.status,
    rating: draft.rating ?? previous?.rating ?? null,
    genres: draft.genres ?? previous?.genres ?? [],
    posterPath: draft.posterPath ?? previous?.posterPath ?? null,
    runtimeMinutes: draft.runtimeMinutes ?? previous?.runtimeMinutes ?? null,
    seasons: draft.seasons ?? previous?.seasons ?? null,
    progress: draft.progress ?? previous?.progress ?? null,
    notes: draft.notes ?? previous?.notes ?? "",
    addedAt: previous?.addedAt ?? now,
    updatedAt: now,
    source: previous?.source ?? "session",
  };
}

export async function upsertCinemaLibraryEntry(
  draft: CinemaLibraryDraft,
): Promise<{ entry: CinemaLibraryEntry; storageMode: CinemaStorageMode }> {
  const client = getRemoteClient();
  const rawId = getCinemaLibraryDataSourceId();

  if (!client || !rawId) {
    const existing = Array.from(memoryStore.entries.values()).find(
      (item) => item.titleKey === draft.titleKey,
    );
    const entry = materialise(draft, existing ?? null);
    memoryStore.entries.set(entry.titleKey, { ...entry, source: "session" });
    return {
      entry: { ...entry, source: "session" },
      storageMode: "session",
    };
  }

  const ds = await resolveDataSource(client, rawId);
  const existing = await findEntryPage(client, ds, draft.titleKey);
  const entry = materialise(draft, existing?.entry ?? null);
  const properties = toNotionProperties(ds, {
    ...entry,
    source: "notion",
  }) as never;

  if (existing) {
    await client.pages.update({
      page_id: existing.entry.id,
      properties,
    });
    return {
      entry: { ...entry, id: existing.entry.id, source: "notion" },
      storageMode: "cloud",
    };
  }

  const created = await client.pages.create({
    parent: { data_source_id: ds.dataSourceId },
    properties,
  });

  return {
    entry: { ...entry, id: created.id, source: "notion" },
    storageMode: "cloud",
  };
}

async function findEntryPage(
  client: Client,
  ds: CachedDataSource,
  titleKey: string,
): Promise<{ entry: CinemaLibraryEntry } | null> {
  const pages = await queryAllPages(client, ds.dataSourceId);
  for (const page of pages) {
    const parsed = parsePage(page, ds);
    if (parsed.kind === "entry" && parsed.entry.titleKey === titleKey) {
      return { entry: parsed.entry };
    }
  }
  return null;
}

export async function patchCinemaLibraryEntry(
  id: string,
  patch: z.infer<typeof CinemaLibraryPatchSchema>,
): Promise<{
  entry: CinemaLibraryEntry | null;
  storageMode: CinemaStorageMode;
}> {
  const client = getRemoteClient();
  const rawId = getCinemaLibraryDataSourceId();

  if (!client || !rawId) {
    const found = Array.from(memoryStore.entries.values()).find(
      (item) => item.id === id,
    );
    if (!found) return { entry: null, storageMode: "session" };
    const next: CinemaLibraryEntry = {
      ...found,
      ...("status" in patch && patch.status ? { status: patch.status } : {}),
      ...("rating" in patch ? { rating: patch.rating ?? null } : {}),
      ...("notes" in patch && patch.notes !== undefined
        ? { notes: patch.notes }
        : {}),
      ...("progress" in patch ? { progress: patch.progress ?? null } : {}),
      updatedAt: new Date().toISOString(),
    };
    memoryStore.entries.set(next.titleKey, next);
    return { entry: next, storageMode: "session" };
  }

  const ds = await resolveDataSource(client, rawId);
  const pages = await queryAllPages(client, ds.dataSourceId);
  let target: CinemaLibraryEntry | null = null;
  for (const page of pages) {
    const parsed = parsePage(page, ds);
    if (parsed.kind === "entry" && parsed.entry.id === id) {
      target = parsed.entry;
      break;
    }
  }
  if (!target) return { entry: null, storageMode: "cloud" };

  const next: CinemaLibraryEntry = {
    ...target,
    status: patch.status ?? target.status,
    rating: patch.rating !== undefined ? patch.rating : target.rating,
    notes: patch.notes !== undefined ? patch.notes : target.notes,
    progress: patch.progress !== undefined ? patch.progress : target.progress,
    updatedAt: new Date().toISOString(),
  };

  await client.pages.update({
    page_id: id,
    properties: toNotionProperties(ds, next) as never,
  });

  return { entry: next, storageMode: "cloud" };
}

export async function archiveCinemaLibraryEntry(
  id: string,
): Promise<{ ok: boolean; storageMode: CinemaStorageMode }> {
  const client = getRemoteClient();
  const rawId = getCinemaLibraryDataSourceId();

  if (!client || !rawId) {
    const entry = Array.from(memoryStore.entries.entries()).find(
      ([, value]) => value.id === id,
    );
    if (!entry) return { ok: false, storageMode: "session" };
    memoryStore.entries.delete(entry[0]);
    return { ok: true, storageMode: "session" };
  }

  try {
    await client.pages.update({ page_id: id, in_trash: true });
    return { ok: true, storageMode: "cloud" };
  } catch {
    return { ok: false, storageMode: "cloud" };
  }
}

/* -------------------------------------------------------------------------- */
/* Preferences — one row inside the same database, no extra env var           */
/* -------------------------------------------------------------------------- */

export async function saveCinemaPrefs(
  prefs: CinemaPrefs,
): Promise<{ prefs: CinemaPrefs; storageMode: CinemaStorageMode }> {
  const parsed = CinemaPrefsSchema.parse(prefs);
  memoryStore.prefs = parsed;

  const client = getRemoteClient();
  const rawId = getCinemaLibraryDataSourceId();
  if (!client || !rawId) return { prefs: parsed, storageMode: "session" };

  try {
    const ds = await resolveDataSource(client, rawId);
    const pages = await queryAllPages(client, ds.dataSourceId);
    const existing = pages.find(
      (page) =>
        readText(page.properties[ds.titleProp]) === CINEMA_PREFS_ROW_TITLE,
    );

    const properties: Record<string, unknown> = {
      [ds.titleProp]: { title: toRichTextChunks(CINEMA_PREFS_ROW_TITLE) },
    };
    assignString(
      properties,
      ds.properties,
      PROP.payload,
      buildPrefsEnvelope(parsed),
    );

    if (existing) {
      await client.pages.update({
        page_id: existing.id,
        properties: properties as never,
      });
    } else {
      await client.pages.create({
        parent: { data_source_id: ds.dataSourceId },
        properties: properties as never,
      });
    }
    return { prefs: parsed, storageMode: "cloud" };
  } catch {
    return { prefs: parsed, storageMode: "session" };
  }
}
