import "server-only";
import {
  CONTENT_META,
  formatContentDate,
  getContentIndex,
  type ContentItem,
  type ContentType,
} from "./notion-cms";
import type { LatestItem } from "./latest-types";

export type { LatestItem };

export type LatestResult = {
  items: LatestItem[];
  configured: boolean;
  error: "missing-config" | "unavailable" | null;
};

export const LATEST_DEFAULT_TYPES: ContentType[] = [
  "projects",
  "articles",
  "blog",
  "news",
  "tutorials",
];

function toLatestItem(item: ContentItem): LatestItem {
  return {
    id: item.id,
    type: item.type,
    typeLabel: CONTENT_META[item.type].singular,
    title: item.title,
    slug: item.slug,
    href: `/${item.type}/${encodeURIComponent(item.slug)}`,
    summary: item.description,
    category: item.categories[0] ?? null,
    date: item.date,
    dateLabel: formatContentDate(item.date),
    readTime: item.readTime,
    image: item.thumbnail || item.image || null,
  };
}

const timestamp = (value: string | null) =>
  value ? Date.parse(value) || 0 : 0;

/**
 * The newest published entries across the requested collections.
 *
 * Reuses `getContentIndex`, which is already `cache()`d and filtered to
 * published pages, so this adds no Notion round-trips beyond the collections
 * that were asked for. A collection that is not configured contributes nothing
 * rather than failing the whole result.
 */
export async function getLatestContent(
  types: ContentType[] = LATEST_DEFAULT_TYPES,
  limit = 6,
): Promise<LatestResult> {
  const results = await Promise.all(types.map((type) => getContentIndex(type)));

  const items = results
    .flatMap((result) => result.items)
    .map(toLatestItem)
    .sort(
      (a, b) =>
        timestamp(b.date) - timestamp(a.date) || a.title.localeCompare(b.title),
    )
    .slice(0, Math.max(1, Math.min(limit, 24)));

  const configured = results.some((result) => result.configured);
  const failed = results.every(
    (result) => !result.configured || result.error === "unavailable",
  );

  return {
    items,
    configured,
    error: !configured
      ? "missing-config"
      : failed && !items.length
        ? "unavailable"
        : null,
  };
}
