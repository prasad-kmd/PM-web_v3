import type { Metadata } from "next";
import {
  CONTENT_META,
  type ContentItem,
  type ContentType,
} from "@/lib/notion-cms";
import {
  entryDescription,
  entryOgImagePath,
  ogImagePath,
  type OgImageOptions,
} from "@/lib/og/url";
import { SITE_NAME, getSiteUrl } from "@/lib/site";

/** Open Graph standard size; `/api/og` renders at exactly this size. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export type { OgImageOptions };

/** Absolute `/api/og` URL for `og:image` / `twitter:image`. */
export function ogImageUrl(
  title: string,
  description = "",
  type = "default",
  options: OgImageOptions = {},
) {
  return `${getSiteUrl()}${ogImagePath(title, description, type, options)}`;
}

export function getContentMetadata(
  item: ContentItem,
  type: ContentType,
): Metadata {
  const path = `/${type}/${encodeURIComponent(item.slug)}`;
  const url = new URL(path, getSiteUrl()).toString();
  const title = `${item.title} | ${CONTENT_META[type].label}`;
  const description = entryDescription(item, type);
  const image = `${getSiteUrl()}${entryOgImagePath(item, type)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [...item.categories, ...item.tags, ...item.technical],
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "article",
      publishedTime: metadataDate(item.date),
      modifiedTime: metadataDate(item.lastEditedTime || item.date),
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

/** Omit malformed CMS dates instead of publishing invalid social timestamps. */
export function metadataDate(
  value: string | null | undefined,
): string | undefined {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : undefined;
}
