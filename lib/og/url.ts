/**
 * Client-safe `/api/og` URL builders. `lib/content-metadata.ts` prefixes the
 * site origin for `og:image`; listings and the reader use the same relative
 * path as a thumbnail/cover fallback, so both hit one cached image.
 */
import {
  CONTENT_META,
  formatContentDate,
  type ContentType,
} from "@/lib/content-types";
import type { ContentItem } from "@/lib/notion-cms";

export type OgImageOptions = {
  /** `detail` (an entry), `collection` (a listing) or `home` (site default). */
  kind?: "detail" | "collection" | "home";
  /** Short, already formatted date, e.g. "Oct 18, 2026". */
  date?: string | null;
  /** Reading time in minutes. */
  read?: number | null;
  /** Published entry count for taxonomy collection cards. */
  count?: number | null;
  /** Same-origin `/api/notion-image?…` cover; anything else is ignored. */
  cover?: string | null;
};

/** Relative `/api/og?…` path. */
export function ogImagePath(
  title: string,
  description = "",
  type = "default",
  options: OgImageOptions = {},
) {
  const query = new URLSearchParams({
    title: title.slice(0, 180),
    description: description.slice(0, 260),
    type,
  });
  if (options.kind) query.set("kind", options.kind);
  if (options.date) query.set("date", options.date.slice(0, 40));
  if (options.read && Number.isFinite(options.read))
    query.set("read", String(Math.round(options.read)));
  if (
    options.count !== null &&
    options.count !== undefined &&
    Number.isFinite(options.count) &&
    options.count >= 0
  )
    query.set("count", String(Math.round(options.count)));
  if (options.cover?.startsWith("/api/notion-image?"))
    query.set("cover", options.cover);
  return `/api/og?${query}`;
}

type EntryFields = Pick<
  ContentItem,
  "title" | "description" | "date" | "readTime"
> & {
  /** Cover, embedded in the card when present (listings omit it). */
  image?: string | null;
};

/** Description used for an entry's metadata and its share image. */
export function entryDescription(item: EntryFields, type: ContentType) {
  return (
    item.description ||
    `${item.title} — ${CONTENT_META[type].label} by Prasad Madhuranga.`
  );
}

/** Relative path of an entry's share image (its `og:image`, minus origin). */
export function entryOgImagePath(item: EntryFields, type: ContentType) {
  return ogImagePath(item.title, entryDescription(item, type), type, {
    kind: "detail",
    date: formatContentDate(item.date),
    read: item.readTime,
    cover: item.image,
  });
}
