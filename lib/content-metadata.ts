import type { Metadata } from "next";
import {
  CONTENT_META,
  formatContentDate,
  type ContentItem,
  type ContentType,
} from "@/lib/notion-cms";
import { getSiteUrl } from "@/lib/site";

/** Open Graph standard size; `/api/og` renders at exactly this size. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export type OgImageOptions = {
  /** `detail` (an entry), `collection` (a listing) or `home` (site default). */
  kind?: "detail" | "collection" | "home";
  /** Short, already formatted date, e.g. "Oct 18, 2026". */
  date?: string | null;
  /** Reading time in minutes. */
  read?: number | null;
  /** Same-origin `/api/notion-image?…` cover; anything else is ignored. */
  cover?: string | null;
};

export function ogImageUrl(
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
  if (options.cover?.startsWith("/api/notion-image?"))
    query.set("cover", options.cover);
  return `${getSiteUrl()}/api/og?${query}`;
}

export function getContentMetadata(
  item: ContentItem,
  type: ContentType,
): Metadata {
  const path = `/${type}/${encodeURIComponent(item.slug)}`;
  const url = new URL(path, getSiteUrl()).toString();
  const title = `${item.title} | ${CONTENT_META[type].label}`;
  const description =
    item.description ||
    `${item.title} — ${CONTENT_META[type].label} by Prasad Madhuranga.`;
  const image = ogImageUrl(item.title, description, type, {
    kind: "detail",
    date: formatContentDate(item.date),
    read: item.readTime,
    cover: item.image,
  });
  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [...item.categories, ...item.tags, ...item.technical],
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: item.date || undefined,
      authors: item.author?.name ? [item.author.name] : undefined,
      images: [{ url: image, ...OG_IMAGE_SIZE, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
