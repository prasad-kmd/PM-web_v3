import type { Metadata } from "next";
import {
  CONTENT_META,
  type ContentItem,
  type ContentType,
} from "@/lib/notion-cms";
import { getSiteUrl } from "@/lib/site";

export function ogImageUrl(title: string, description = "", type = "default") {
  const query = new URLSearchParams({
    title: title.slice(0, 180),
    description: description.slice(0, 260),
    type,
  });
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
  const image = ogImageUrl(item.title, description, type);
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
      images: [{ url: image, width: 1280, height: 720, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
