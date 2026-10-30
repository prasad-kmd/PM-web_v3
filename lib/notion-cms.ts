// Adapted from PM-Web_V2 (AGPL-3.0), with v3 routing and safety changes.
import "server-only";
import { Client } from "@notionhq/client";
import { cache } from "react";

import { CONTENT_META, CONTENT_TYPES, type ContentType } from "./content-types";
import { resolveInlineLinks, stripInlineLinks } from "./inline-links";
import { slugify } from "./slugify";

export { CONTENT_META, CONTENT_TYPES, type ContentType };
export { formatContentDate } from "./content-types";

export type AuthorSummary = {
  id: string;
  name: string;
  slug: string;
  role: string;
  biography: string;
  avatar: string | null;
  twitter: string;
  github: string;
  linkedin: string;
};

export type ContentItem = {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  description: string;
  date: string | null;
  lastEditedTime: string | null;
  tags: string[];
  categories: string[];
  technical: string[];
  image: string | null;
  /** Listing-only image: never falls back to a cover or avatar. */
  thumbnail: string | null;
  readTime: number | null;
  aiAssisted: boolean;
  author: AuthorSummary | null;
};

export type NotionBlock = {
  id: string;
  type: string;
  has_children?: boolean;
  children?: NotionBlock[];
  [key: string]: unknown;
};

export type ContentIndexResult = {
  items: ContentItem[];
  configured: boolean;
  error: "missing-config" | "unavailable" | null;
};

export type ContentDetailResult = ContentIndexResult & {
  item: ContentItem | null;
  blocks: NotionBlock[];
};

const CACHE_SECONDS = 60 * 60;
const IMAGE_CACHE_SECONDS = 15 * 60;
const DEFAULT_API_VERSION = "2026-03-11";
const MAX_BLOCK_DEPTH = 5;

type CacheMode = "cache" | "image-cache" | "no-store";
type NotionClient = InstanceType<typeof Client>;

const DATABASE_ENV: Record<ContentType, string[]> = {
  projects: ["NOTION_PROJECTS_ID", "NOTION_PROJECTS_DATABASE_ID"],
  blog: ["NOTION_BLOG_ID"],
  articles: ["NOTION_ARTICLES_ID"],
  tutorials: ["NOTION_TUTORIALS_ID"],
  glossary: ["NOTION_GLOSSARY_ID", "NOTION_WIKI_ID"],
  news: ["NOTION_NEWS_ID", "NOTION_NEWS_DATABASE_ID"],
};
const AUTHORS_DATABASE_ENV = "NOTION_AUTHORS_ID";

type UnknownRecord = Record<string, unknown>;
type NotionPage = {
  id: string;
  url?: string;
  created_time?: string;
  last_edited_time?: string;
  archived?: boolean;
  in_trash?: boolean;
  cover?: unknown;
  properties?: Record<string, unknown>;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object"
    ? (value as UnknownRecord)
    : null;
}

function getPlainText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      const record = asRecord(part);
      return typeof record?.plain_text === "string" ? record.plain_text : "";
    })
    .join("")
    .trim();
}

function findProperty(
  properties: Record<string, unknown>,
  names: string[],
): UnknownRecord | null {
  const entries = Object.entries(properties);
  for (const name of names) {
    const entry = entries.find(
      ([key]) => key.toLowerCase() === name.toLowerCase(),
    );
    if (entry) return asRecord(entry[1]);
  }
  return null;
}

function firstTitle(properties: Record<string, unknown>): string {
  for (const value of Object.values(properties)) {
    const property = asRecord(value);
    if (property?.type === "title") {
      return getPlainText(property.title);
    }
  }
  return "Untitled";
}

function propertyText(property: UnknownRecord | null): string {
  if (!property) return "";
  const type = typeof property.type === "string" ? property.type : "";
  if (type === "title") return getPlainText(property.title);
  if (type === "rich_text") return getPlainText(property.rich_text);
  if (type === "select" || type === "status") {
    const selected = asRecord(property[type]);
    return typeof selected?.name === "string" ? selected.name : "";
  }
  if (type === "url")
    return typeof property.url === "string" ? property.url : "";
  if (type === "email")
    return typeof property.email === "string" ? property.email : "";
  if (type === "phone_number") {
    return typeof property.phone_number === "string"
      ? property.phone_number
      : "";
  }
  return "";
}

function propertyValues(property: UnknownRecord | null): string[] {
  if (!property) return [];
  const type = typeof property.type === "string" ? property.type : "";
  const value = property[type];
  if (type === "multi_select" && Array.isArray(value)) {
    return value.flatMap((entry) => {
      const name = asRecord(entry)?.name;
      return typeof name === "string" && name.trim() ? [name.trim()] : [];
    });
  }
  const single = propertyText(property);
  return single ? [single] : [];
}

function propertyDate(property: UnknownRecord | null): string | null {
  const dateProperty = property?.date;
  const date = asRecord(dateProperty);
  return typeof date?.start === "string" ? date.start : null;
}

function propertyNumber(property: UnknownRecord | null): number | null {
  const number = property?.number;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

function propertyCheckbox(property: UnknownRecord | null): boolean {
  return property?.checkbox === true;
}

function propertyImage(property: UnknownRecord | null): string | null {
  if (!property) return null;
  const type = typeof property.type === "string" ? property.type : "";
  const value = property[type];
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  if (Array.isArray(value)) {
    const first = asRecord(value[0]);
    const file = asRecord(first?.file);
    const external = asRecord(first?.external);
    const url = file?.url ?? external?.url;
    if (typeof url === "string") return url;
  }
  return null;
}

function pageCoverUrl(cover: unknown): string | null {
  const record = asRecord(cover);
  if (!record) return null;
  const file = asRecord(record.file);
  const external = asRecord(record.external);
  const url = file?.url ?? external?.url;
  return typeof url === "string" ? url : null;
}

function readStatus(properties: Record<string, unknown>): string {
  return propertyText(
    findProperty(properties, ["Status", "Publication status"]),
  );
}

/**
 * Entries sharing a slug (usually identical titles in a collection without a
 * Slug property) stay reachable: the oldest keeps the plain slug, later ones
 * get a short page-id suffix, so existing URLs never change when a newer
 * namesake is published.
 */
function dedupeSlugs<
  T extends { id: string; slug: string; date: string | null },
>(items: T[]): T[] {
  const taken = new Set<string>();
  const renamed = new Map<string, string>();
  const oldestFirst = [...items].sort(
    (a, b) =>
      (a.date ? Date.parse(a.date) : 0) - (b.date ? Date.parse(b.date) : 0) ||
      a.id.localeCompare(b.id),
  );
  for (const item of oldestFirst) {
    let slug = item.slug;
    if (taken.has(slug)) {
      const id = item.id.replace(/-/g, "");
      slug = `${item.slug}-${id.slice(0, 6)}`;
      if (taken.has(slug)) slug = `${item.slug}-${id}`;
      renamed.set(item.id, slug);
    }
    taken.add(slug);
  }
  return renamed.size
    ? items.map((item) =>
        renamed.has(item.id) ? { ...item, slug: renamed.get(item.id)! } : item,
      )
    : items;
}

function normalizePage(
  page: NotionPage,
  type: ContentType,
  author: AuthorSummary | null,
): ContentItem {
  const properties = page.properties ?? {};
  const title = stripInlineLinks(firstTitle(properties));
  const slug =
    slugify(propertyText(findProperty(properties, ["Slug", "URL Slug"]))) ||
    slugify(title) ||
    page.id.replaceAll("-", "");
  const imageSource =
    propertyImage(
      findProperty(properties, ["Thumbnail", "Cover image", "Image"]),
    ) || pageCoverUrl(page.cover);
  const image = imageSource
    ? `/api/notion-image?type=page&id=${encodeURIComponent(page.id)}&collection=${type}`
    : null;
  const thumbnail = propertyImage(findProperty(properties, ["Thumbnail"]))
    ? `/api/notion-image?type=page&source=thumbnail&id=${encodeURIComponent(page.id)}&collection=${type}`
    : null;
  const date = propertyDate(
    findProperty(properties, ["Date", "Published date", "Publication date"]),
  );
  const configuredReadTime = propertyNumber(
    findProperty(properties, ["RTime", "Reading time", "Read time"]),
  );

  return {
    id: page.id,
    type,
    title,
    slug,
    description: stripInlineLinks(
      propertyText(
        findProperty(properties, ["Description", "Summary", "Excerpt"]),
      ),
    ),
    date: date || page.created_time || page.last_edited_time || null,
    lastEditedTime: page.last_edited_time || null,
    tags: propertyValues(findProperty(properties, ["Tags", "Keywords"])),
    categories: propertyValues(
      findProperty(properties, ["Categories", "Category"]),
    ),
    technical: propertyValues(
      findProperty(properties, ["Technical", "Technology"]),
    ),
    image,
    thumbnail,
    readTime:
      configuredReadTime && configuredReadTime > 0
        ? Math.ceil(configuredReadTime)
        : null,
    aiAssisted: propertyCheckbox(
      findProperty(properties, ["AIAssisted", "AI Assisted", "AI-assisted"]),
    ),
    author: author
      ? {
          ...author,
          avatar: author.avatar ? `${author.avatar}&collection=${type}` : null,
        }
      : null,
  };
}

function getToken(): string | null {
  return (
    process.env.NOTION_API_KEY ||
    process.env.NOTION_AUTH_TOKEN ||
    process.env.NOTION_API_TOKEN ||
    null
  );
}

function getDatabaseId(type: ContentType): string | null {
  for (const name of DATABASE_ENV[type]) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

function getApiVersion(): string {
  return process.env.NOTION_API_VERSION?.trim() || DEFAULT_API_VERSION;
}

/** Build a server-only read client using the CMS cache policy. */
export function createNotionClient(
  cacheMode: CacheMode = "cache",
): NotionClient {
  const token = getToken();
  if (!token) throw new Error("Notion API credentials are not configured.");

  const cachedFetch: typeof fetch = async (input, init) => {
    // Notion rate limits integrations; retry a small, bounded number of times.
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(input, {
        ...init,
        signal: init?.signal ?? AbortSignal.timeout(12_000),
        cache: cacheMode === "no-store" ? "no-store" : "force-cache",
        ...(cacheMode === "cache"
          ? { next: { revalidate: CACHE_SECONDS, tags: ["notion-cms"] } }
          : cacheMode === "image-cache"
            ? {
                next: {
                  revalidate: IMAGE_CACHE_SECONDS,
                  tags: ["notion-cms"],
                },
              }
            : {}),
      });
      if (response.status !== 429 || attempt >= 2) return response;
      const seconds = Number(response.headers.get("Retry-After") || "1");
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(3_000, Math.max(250, seconds * 1000))),
      );
    }
  };

  return new Client({
    auth: token,
    notionVersion: getApiVersion(),
    fetch: cachedFetch,
  });
}

async function resolveDataSourceId(
  notion: NotionClient,
  configuredId: string,
): Promise<string> {
  try {
    const database = await notion.databases.retrieve({
      database_id: configuredId,
    });
    const sources = (
      database as unknown as {
        data_sources?: Array<{ id?: string }>;
      }
    ).data_sources;
    const sourceId = sources?.find((source) => source.id)?.id;
    return sourceId || configuredId;
  } catch {
    // A data source ID is also accepted directly; in that case database lookup
    // is not applicable and the query endpoint below will use the given ID.
    return configuredId;
  }
}

async function queryAllPages(
  notion: NotionClient,
  dataSourceId: string,
): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | null = null;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    pages.push(...(response.results as unknown as NotionPage[]));
    cursor = response.has_more ? (response.next_cursor ?? null) : null;
  } while (cursor);

  return pages;
}

function getAuthorsDatabaseId(): string | null {
  return process.env[AUTHORS_DATABASE_ENV]?.trim() || null;
}

function normalizeAuthor(page: NotionPage): AuthorSummary {
  const properties = page.properties ?? {};
  const name = firstTitle(properties);
  const image =
    propertyImage(
      findProperty(properties, ["Avatar", "avatar", "Profile image"]),
    ) || pageCoverUrl(page.cover);
  return {
    id: page.id,
    name,
    slug:
      slugify(propertyText(findProperty(properties, ["Slug", "URL Slug"]))) ||
      slugify(name) ||
      page.id.replaceAll("-", ""),
    role: propertyText(findProperty(properties, ["Role", "Title", "Position"])),
    biography: propertyText(
      findProperty(properties, ["Biography", "Bio", "Description"]),
    ),
    avatar: image
      ? `/api/notion-image?type=page&id=${encodeURIComponent(page.id)}`
      : null,
    twitter: propertyText(findProperty(properties, ["Twitter", "twitter"])),
    github: propertyText(
      findProperty(properties, ["GitHub", "Github", "github"]),
    ),
    linkedin: propertyText(
      findProperty(properties, ["LinkedIn", "Linkedin", "linkedin"]),
    ),
  };
}

function getAuthorRelationId(
  properties: Record<string, unknown>,
): string | null {
  const relationProperty = findProperty(properties, ["Authors", "Author"]);
  const relationType =
    typeof relationProperty?.type === "string"
      ? relationProperty.type
      : "relation";
  const relation = relationProperty?.[relationType];
  if (!Array.isArray(relation)) return null;
  const first = asRecord(relation[0]);
  return typeof first?.id === "string" ? first.id : null;
}

async function queryAuthors(
  notion: NotionClient,
): Promise<Map<string, AuthorSummary>> {
  const databaseId = getAuthorsDatabaseId();
  if (!databaseId) return new Map();

  try {
    const dataSourceId = await resolveDataSourceId(notion, databaseId);
    const pages = await queryAllPages(notion, dataSourceId);
    const publishedStatus = (
      process.env.NOTION_PUBLISHED_STATUS?.trim() || "Published"
    ).toLowerCase();
    return new Map(
      pages
        .filter((page) => !page.archived && !page.in_trash)
        .filter((page) => {
          const status = readStatus(page.properties ?? {});
          return !status || status.toLowerCase() === publishedStatus;
        })
        .map((page) => [page.id, normalizeAuthor(page)]),
    );
  } catch (error) {
    console.error("Unable to load the Notion authors database:", error);
    return new Map();
  }
}

export const getContentIndex = cache(
  async (type: ContentType): Promise<ContentIndexResult> => {
    const token = getToken();
    const configuredId = getDatabaseId(type);
    if (!token || !configuredId) {
      return { items: [], configured: false, error: "missing-config" };
    }

    try {
      const notion = createNotionClient();
      const dataSourceId = await resolveDataSourceId(notion, configuredId);
      const [pages, authors] = await Promise.all([
        queryAllPages(notion, dataSourceId),
        queryAuthors(notion),
      ]);
      const publishedStatus = (
        process.env.NOTION_PUBLISHED_STATUS?.trim() || "Published"
      ).toLowerCase();
      const items = pages
        .filter((page) => !page.archived && !page.in_trash)
        .filter((page) => {
          const status = readStatus(page.properties ?? {});
          return status.toLowerCase() === publishedStatus;
        })
        .map((page) => {
          const authorId = getAuthorRelationId(page.properties ?? {});
          return normalizePage(
            page,
            type,
            authorId ? (authors.get(authorId) ?? null) : null,
          );
        })
        .filter((item) => item.title && item.slug)
        .sort((a, b) => {
          const dateA = a.date ? Date.parse(a.date) : 0;
          const dateB = b.date ? Date.parse(b.date) : 0;
          return dateB - dateA;
        });

      return { items: dedupeSlugs(items), configured: true, error: null };
    } catch (error) {
      console.error(`Unable to load Notion ${type} content:`, error);
      return { items: [], configured: true, error: "unavailable" };
    }
  },
);

async function queryBlockChildren(
  notion: NotionClient,
  blockId: string,
  depth: number,
): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | null = null;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    const results = response.results as unknown as NotionBlock[];
    blocks.push(...results);
    cursor = response.has_more ? (response.next_cursor ?? null) : null;
  } while (cursor);

  if (depth >= MAX_BLOCK_DEPTH) return blocks;

  return Promise.all(
    blocks.map(async (block) => {
      if (!block.has_children) return block;
      try {
        return {
          ...block,
          children: await queryBlockChildren(notion, block.id, depth + 1),
        };
      } catch (error) {
        console.error(
          `Unable to load Notion block children for ${block.id}:`,
          error,
        );
        return { ...block, children: [] };
      }
    }),
  );
}

export const getContentDetail = cache(
  async (type: ContentType, slug: string): Promise<ContentDetailResult> => {
    const index = await getContentIndex(type);
    const item = index.items.find((entry) => entry.slug === slug) ?? null;
    if (!index.configured || index.error || !item) {
      return { ...index, item, blocks: [] };
    }

    try {
      const notion = createNotionClient();
      const blocks = resolveInlineLinks(
        await queryBlockChildren(notion, item.id, 0),
      );
      return { ...index, item, blocks };
    } catch (error) {
      console.error(`Unable to load Notion page body for ${item.id}:`, error);
      return { ...index, item, blocks: [], error: "unavailable" };
    }
  },
);

export async function getFreshNotionImageUrl(
  resourceType: "block" | "page",
  id: string,
  source: "default" | "thumbnail" | "icon" = "default",
): Promise<string | null> {
  const notion = createNotionClient("image-cache");
  const resource = (resourceType === "block"
    ? await notion.blocks.retrieve({ block_id: id })
    : await notion.pages.retrieve({ page_id: id })) as unknown as UnknownRecord;
  const type = typeof resource.type === "string" ? resource.type : "";
  const imageBlock = asRecord(resource[type]);
  if (source === "icon") {
    if (resourceType !== "block" || type !== "callout") return null;
    const icon = asRecord(imageBlock?.icon);
    const asset = asRecord(icon?.file) || asRecord(icon?.external);
    const url = asset?.url;
    return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
  }
  const pageProperties = asRecord(resource.properties) as Record<
    string,
    unknown
  > | null;
  if (source === "thumbnail") {
    if (resourceType !== "page" || !pageProperties) return null;
    const thumbnail = propertyImage(
      findProperty(pageProperties, ["Thumbnail"]),
    );
    return thumbnail && /^https?:\/\//i.test(thumbnail) ? thumbnail : null;
  }
  const pagePropertyImage = pageProperties
    ? propertyImage(
        findProperty(pageProperties, [
          "Thumbnail",
          "Cover image",
          "Image",
          "Avatar",
          "Profile image",
        ]),
      )
    : null;
  const image =
    resourceType === "page"
      ? pagePropertyImage || pageCoverUrl(resource.cover)
      : null;
  const file = asRecord(imageBlock?.file);
  const external = asRecord(imageBlock?.external);
  const url = image || file?.url || external?.url;
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
}

export function getConfiguredContentEnv(type: ContentType): string[] {
  return [
    "NOTION_API_KEY, NOTION_AUTH_TOKEN or NOTION_API_TOKEN",
    ...DATABASE_ENV[type],
  ];
}

export type ContentHeading = { id: string; text: string; level: number };

function blockPlainText(block: NotionBlock): string {
  const data = asRecord(block[block.type]);
  if (!data) return "";
  const richText = getPlainText(data.rich_text);
  const equation = typeof data.expression === "string" ? data.expression : "";
  const cells =
    block.type === "table_row" && Array.isArray(data.cells)
      ? data.cells.map(getPlainText).join(" ")
      : "";
  const children = (block.children ?? []).map(blockPlainText).join(" ");
  return [richText, equation, cells, children].filter(Boolean).join(" ");
}

export function getContentHeadings(blocks: NotionBlock[]): ContentHeading[] {
  const headings: ContentHeading[] = [];
  const visit = (items: NotionBlock[]) => {
    for (const block of items) {
      if (["heading_1", "heading_2", "heading_3"].includes(block.type)) {
        const data = asRecord(block[block.type]);
        const level = Number(block.type.at(-1)) || 2;
        const text = data ? getPlainText(data.rich_text) : "";
        if (text) headings.push({ id: block.id, text, level });
      }
      if (block.children?.length) visit(block.children);
    }
  };
  visit(blocks);
  return headings;
}

export function estimateReadingTime(blocks: NotionBlock[]): number {
  const words = blockPlainText({ id: "root", type: "root", children: blocks })
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}
