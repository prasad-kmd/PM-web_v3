import "server-only";
import type { Metadata } from "next";
import {
  CONTENT_META,
  getContentIndex,
  type ContentType,
} from "@/lib/notion-cms";
import {
  getContentMetadata,
  OG_IMAGE_SIZE,
  ogImageUrl,
} from "@/lib/content-metadata";
import { getSiteUrl } from "@/lib/site";

/**
 * Shared building blocks for the explicit per-collection routes
 * (`app/projects`, `app/blog`, `app/articles`, `app/tutorials`, `app/glossary`,
 * `app/news`).
 *
 * Every collection owns its own route files so it can be customised on its own,
 * while metadata, static params and revalidation stay consistent from here.
 */

export type CollectionDetailParams = Promise<{ slug: string }>;

export function collectionMetadata(type: ContentType): Metadata {
  const meta = CONTENT_META[type];
  const url = `${getSiteUrl()}/${type}`;
  const image = ogImageUrl(meta.label, meta.description, type, {
    kind: "collection",
  });
  return {
    title: meta.label,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: {
      title: meta.label,
      description: meta.description,
      url,
      type: "website",
      images: [{ url: image, ...OG_IMAGE_SIZE, alt: meta.label }],
    },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export async function collectionDetailMetadata(
  type: ContentType,
  params: CollectionDetailParams,
): Promise<Metadata> {
  const { slug } = await params;
  const result = await getContentIndex(type);
  const item = result.items.find((entry) => entry.slug === slug);
  return item ? getContentMetadata(item, type) : { title: "Entry unavailable" };
}

export async function collectionStaticParams(type: ContentType) {
  const index = await getContentIndex(type);
  return index.items.map((item) => ({ slug: item.slug }));
}
