import "server-only";
import type { Metadata } from "next";
import { OG_IMAGE_SIZE, ogImageUrl } from "./content-metadata";
import { SITE_NAME, getSiteUrl } from "./site";
import {
  TAXONOMY_INDEX_MIN_ITEMS,
  TAXONOMY_META,
  getTaxonomyIndex,
  getTaxonomyTerm,
  type TaxonomyKind,
} from "./taxonomy";

/** Shared metadata/static-params for `app/categories` and `app/tags`. */

export type TaxonomyTermParams = Promise<{ slug: string }>;

export function taxonomyIndexMetadata(kind: TaxonomyKind): Metadata {
  const meta = TAXONOMY_META[kind];
  const url = `${getSiteUrl()}/${kind}`;
  const image = ogImageUrl(meta.label, meta.description, kind, {
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
      siteName: SITE_NAME,
      locale: "en_US",
      images: [{ url: image, ...OG_IMAGE_SIZE, alt: meta.label }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.label,
      description: meta.description,
      images: [image],
    },
  };
}

export async function taxonomyTermMetadata(
  kind: TaxonomyKind,
  params: TaxonomyTermParams,
): Promise<Metadata> {
  const { slug } = await params;
  const { term } = await getTaxonomyTerm(kind, slug);
  if (!term) {
    return {
      title: "Topic unavailable",
      robots: { index: false, follow: true },
    };
  }
  const meta = TAXONOMY_META[kind];
  const title = `${term.label} · ${meta.label}`;
  const description = `${term.count} published ${term.count === 1 ? "entry" : "entries"} filed under the ${meta.singular.toLowerCase()} “${term.label}”, across every collection in the workspace.`;
  const url = `${getSiteUrl()}/${kind}/${encodeURIComponent(term.slug)}`;
  const image = ogImageUrl(term.label, description, kind, {
    kind: "collection",
    count: term.count,
  });
  return {
    title,
    description,
    keywords: [term.label],
    alternates: { canonical: url },
    // Singleton terms are useful to follow from an entry, but too thin to
    // put in the search index (mirrors TAXONOMY_INDEX_MIN_ITEMS in sitemap).
    ...(term.count < TAXONOMY_INDEX_MIN_ITEMS
      ? { robots: { index: false, follow: true } }
      : {}),
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
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

export async function taxonomyStaticParams(kind: TaxonomyKind) {
  const index = await getTaxonomyIndex();
  return index.terms[kind].map((term) => ({ slug: term.slug }));
}
